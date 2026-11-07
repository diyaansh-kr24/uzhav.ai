import asyncio, json, secrets, time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from . import store, guards, pipeline
from .config import ROOT, DATA, DISTRICTS, STAGES, configured, setting
from .schemas import CaseInput, ChatInput, ReviewInput, EventInput
from .retrieval import Retriever
from .providers import transcribe, ProviderError

retriever = Retriever()
semaphore = asyncio.Semaphore(3)
limits = defaultdict(deque)


@asynccontextmanager
async def lifespan(app):
    store.init()
    yield


app = FastAPI(title="Crop Insurance Assistant", version="1.0.0", lifespan=lifespan)


def rate(key, limit=15):
    now = time.monotonic()
    q = limits[key]
    while q and q[0] < now - 60:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Too many requests. Please wait a minute.")
    q.append(now)


@app.middleware("http")
async def boundary(request: Request, call_next):
    # Prevent casual cross-site use of this local prototype. Bind to localhost by default.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin", "")
        if origin and origin not in (
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
        ):
            from fastapi.responses import JSONResponse

            return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        try:
            size = int(request.headers.get("content-length", "0"))
        except ValueError:
            size = 6_000_001
        if size < 0 or size > 6_000_000:
            from fastapi.responses import JSONResponse

            return JSONResponse({"detail": "Request too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = (
        "no-store" if request.url.path.startswith("/api/") else "no-cache"
    )
    return response


def case_auth(cid, authorization):
    profile = store.owned(cid, authorization.removeprefix("Bearer "))
    if profile is None:
        raise HTTPException(404, "Case not found or access expired")
    return profile


def reviewer(authorization):
    token = setting("REVIEWER_TOKEN")
    if not token or not secrets.compare_digest(authorization, "Bearer " + token):
        raise HTTPException(401, "Reviewer access required")


def case_snapshot(cid):
    result = store.snapshot(cid)
    lookup = {row["id"]: row for row in retriever.rows}
    for review in result["reviews"]:
        citations = json.loads(review["citations"])
        review["citations"] = [
            lookup[c] if isinstance(c, str) else c
            for c in citations
            if not isinstance(c, str) or c in lookup
        ]
    return result


@app.get("/api/health")
def health():
    return {
        "llm_configured": configured("AICREDITS_API_KEY"),
        "sarvam_configured": configured("SARVAM_API_KEY"),
        "model": setting("AICREDITS_MODEL", "deepseek/deepseek-v3.2"),
        "chunks": len(retriever.rows),
        "retrieval": "BM25 + character TF-IDF"
        + (" + dense embeddings" if retriever.dense is not None else ""),
        "districts": DISTRICTS,
        "official_integration": False,
    }


@app.get("/api/sources")
def sources():
    path = DATA / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


@app.post("/api/cases")
def create_case(data: CaseInput, request: Request):
    rate("create:" + request.client.host, 8)
    cid, token = store.create(data.model_dump())
    return {"id": cid, "token": token, **case_snapshot(cid)}


@app.get("/api/cases/{cid}")
def get_case(cid: str, authorization: str = Header(default="")):
    case_auth(cid, authorization)
    return case_snapshot(cid)


@app.put("/api/cases/{cid}")
def update_case(cid: str, data: CaseInput, authorization: str = Header(default="")):
    old = case_auth(cid, authorization)
    # District and season changes start a new case, preventing stale-context contamination.
    if any(old[k] != data.model_dump()[k] for k in ("district", "crop", "season")):
        raise HTTPException(409, "Start a new case to change district, crop or season.")
    with store.connect() as db:
        db.execute(
            "UPDATE cases SET profile=? WHERE id=?",
            (json.dumps(data.model_dump()), cid),
        )
    return case_snapshot(cid)


@app.delete("/api/cases/{cid}")
def delete_case(cid: str, authorization: str = Header(default="")):
    case_auth(cid, authorization)
    with store.connect() as db:
        for table in ("messages", "reviews", "events"):
            db.execute(f"DELETE FROM {table} WHERE case_id=?", (cid,))
        db.execute("DELETE FROM cases WHERE id=?", (cid,))
    return {"deleted": True}


@app.post("/api/cases/{cid}/chat")
async def chat(cid: str, data: ChatInput, authorization: str = Header(default="")):
    profile = case_auth(cid, authorization)
    rate(cid)
    if not data.consent:
        raise HTTPException(
            400, "Consent is required before sending questions to AI providers."
        )
    history = store.snapshot(cid)["messages"]
    async with semaphore:
        try:
            result = await asyncio.wait_for(
                pipeline.run(data.question, data.language, profile, history, retriever),
                timeout=180,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "Response timed out. Please retry.")
    mid = store.save_message(cid, guards.redact(data.question), result)
    return {"id": mid, **result}


@app.post("/api/cases/{cid}/events")
def add_event(cid: str, data: EventInput, authorization: str = Header(default="")):
    case_auth(cid, authorization)
    with store.connect() as db:
        db.execute(
            "INSERT INTO events VALUES(?,?,?,?)",
            (secrets.token_urlsafe(12), cid, data.kind, store.now()),
        )
    return case_snapshot(cid)


@app.get("/api/cases/{cid}/draft", response_class=PlainTextResponse)
def draft(cid: str, authorization: str = Header(default="")):
    profile = case_auth(cid, authorization)
    return "\n".join(
        [
            "CROP INSURANCE ASSISTANCE REQUEST — UNSUBMITTED DRAFT",
            f"District: {profile['district']}",
            f"Crop: {profile['crop']}",
            f"Season: {profile['season']}",
            "Village / insurance unit: [complete offline]",
            "Official application / acknowledgement reference: [complete offline]",
            "Loss date and description: [complete offline]",
            "Previous contact and response: [complete offline]",
            "Assistance requested: Please clarify the applicable requirements and next action for my crop-insurance case.",
            "Attachments: [review with the relevant official]",
            "This draft has not been sent to any insurer or government office.",
        ]
    )


@app.post("/api/cases/{cid}/speech")
async def speech(
    cid: str,
    file: UploadFile = File(...),
    consent: bool = Form(False),
    authorization: str = Header(default=""),
):
    case_auth(cid, authorization)
    rate("speech:" + cid, 6)
    if not consent:
        raise HTTPException(400, "Consent required for sending audio to Sarvam.")
    if file.content_type not in ("audio/webm", "audio/wav", "audio/ogg", "audio/mp4"):
        raise HTTPException(415, "Unsupported audio type")
    content = await file.read(5_000_001)
    if len(content) > 5_000_000:
        raise HTTPException(413, "Audio must be less than 5 MB")
    try:
        return {"text": guards.redact(await transcribe(content, file.content_type))}
    except ProviderError as exc:
        raise HTTPException(503, str(exc))


@app.get("/api/reviews")
def reviews(authorization: str = Header(default="")):
    reviewer(authorization)
    with store.connect() as db:
        rows = db.execute(
            """SELECT r.*,m.question,c.profile FROM reviews r JOIN messages m ON m.id=r.message_id JOIN cases c ON c.id=r.case_id ORDER BY r.created DESC"""
        ).fetchall()
    return [
        {
            **dict(r),
            "profile": json.loads(r["profile"]),
            "citations": json.loads(r["citations"]),
        }
        for r in rows
    ]


@app.post("/api/reviews/{rid}")
def resolve_review(
    rid: str, data: ReviewInput, authorization: str = Header(default="")
):
    reviewer(authorization)
    with store.connect() as db:
        r = db.execute("SELECT * FROM reviews WHERE id=?", (rid,)).fetchone()
        if not r:
            raise HTTPException(404, "Review not found")
        if r["state"] != "pending":
            raise HTTPException(409, "Review already resolved")
        profile = json.loads(
            db.execute(
                "SELECT profile FROM cases WHERE id=?", (r["case_id"],)
            ).fetchone()["profile"]
        )
        allowed = {
            e["id"]
            for e in retriever.rows
            if e["kind"] != "archive"
            and (profile["district"] in e["districts"] or "all" in e["districts"])
        }
        if not set(data.citation_ids) <= allowed:
            raise HTTPException(
                400, "Citations must be active sources within this district scope"
            )
        if guards.decision_claim(data.response):
            raise HTTPException(
                400, "Reviewers cannot issue insurance determinations in this prototype"
            )
        db.execute(
            "UPDATE reviews SET state='reviewed',response=?,citations=?,resolved=? WHERE id=?",
            (
                guards.redact(data.response),
                json.dumps(data.citation_ids),
                store.now(),
                rid,
            ),
        )
    return {"status": "reviewed"}


@app.get("/api/reviewer/evidence")
async def review_evidence(
    q: str, district: str, authorization: str = Header(default="")
):
    reviewer(authorization)
    if district not in DISTRICTS or len(q) > 1600:
        raise HTTPException(400, "Invalid search")
    return await retriever.search(q, district, 8)


dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
