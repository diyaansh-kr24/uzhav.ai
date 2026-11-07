import hashlib, json, secrets, sqlite3
from datetime import datetime, timezone
from .config import DATA, setting


def now():
    return datetime.now(timezone.utc).isoformat()


def connect():
    DATA.mkdir(exist_ok=True)
    db = sqlite3.connect(
        setting("DATABASE_PATH") or str(DATA / "cases.sqlite3"), timeout=10
    )
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    return db


def init():
    with connect() as db:
        db.executescript(
            """CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, token_hash TEXT, profile TEXT, created TEXT);
        CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, case_id TEXT, question TEXT, result TEXT, created TEXT);
        CREATE TABLE IF NOT EXISTS reviews(id TEXT PRIMARY KEY, case_id TEXT, message_id TEXT UNIQUE, reason TEXT, state TEXT, response TEXT, citations TEXT, created TEXT, resolved TEXT);
        CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, case_id TEXT, kind TEXT, created TEXT);"""
        )


def create(profile):
    cid = secrets.token_urlsafe(12)
    token = secrets.token_urlsafe(32)
    with connect() as db:
        db.execute(
            "INSERT INTO cases VALUES(?,?,?,?)",
            (
                cid,
                hashlib.sha256(token.encode()).hexdigest(),
                json.dumps(profile),
                now(),
            ),
        )
    return cid, token


def owned(cid, token):
    with connect() as db:
        r = db.execute("SELECT * FROM cases WHERE id=?", (cid,)).fetchone()
    if not r or not secrets.compare_digest(
        r["token_hash"], hashlib.sha256(token.encode()).hexdigest()
    ):
        return None
    return json.loads(r["profile"])


def snapshot(cid):
    with connect() as db:
        row = db.execute("SELECT * FROM cases WHERE id=?", (cid,)).fetchone()
        messages = [
            {
                "id": r["id"],
                "question": r["question"],
                "result": json.loads(r["result"]),
                "created": r["created"],
            }
            for r in db.execute(
                "SELECT * FROM messages WHERE case_id=? ORDER BY created", (cid,)
            )
        ]
        reviews = [
            dict(r)
            for r in db.execute(
                "SELECT id,reason,state,response,citations,created,resolved FROM reviews WHERE case_id=? ORDER BY created",
                (cid,),
            )
        ]
        events = [
            dict(r)
            for r in db.execute(
                "SELECT kind,created FROM events WHERE case_id=? ORDER BY created",
                (cid,),
            )
        ]
    return {
        "id": cid,
        "profile": json.loads(row["profile"]),
        "messages": messages,
        "reviews": reviews,
        "events": events,
    }


def save_message(cid, question, result):
    mid = secrets.token_urlsafe(12)
    with connect() as db:
        db.execute(
            "INSERT INTO messages VALUES(?,?,?,?,?)",
            (mid, cid, question, json.dumps(result, ensure_ascii=False), now()),
        )
        if result["status"] == "needs_review":
            db.execute(
                "INSERT INTO reviews VALUES(?,?,?,?,?,?,?,?,?)",
                (
                    secrets.token_urlsafe(12),
                    cid,
                    mid,
                    result["reason"],
                    "pending",
                    "",
                    json.dumps(result["evidence"]),
                    now(),
                    None,
                ),
            )
    return mid
