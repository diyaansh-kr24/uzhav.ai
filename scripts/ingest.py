"""Fetch an explicit allowlist, preserve provenance and create page-aware chunks.
Never fetch URLs supplied by the chat model or by a public upload endpoint.
"""

import hashlib, io, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ALLOWED = {
    "pmfby.amnex.co.in",
    "www.pib.gov.in",
    "thanjavur.nic.in",
    "tiruvarur.nic.in",
    "nagapattinam.nic.in",
    "www.tnagrisnet.tn.gov.in",
}


def chunks(text, size=1150, overlap=180):
    text = re.sub(r"[ \t]+", " ", text).strip()
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            cut = text.rfind(" ", start + size // 2, end)
            if cut > start:
                end = cut
        part = text[start:end].strip()
        if len(part) > 70:
            yield part
        if end == len(text):
            break
        start = end - overlap


def ingest():
    from urllib.parse import urlparse

    records = []
    manifest = []
    (DATA / "raw").mkdir(exist_ok=True)
    for source in json.loads((DATA / "sources.json").read_text(encoding="utf-8")):
        assert urlparse(source["url"]).hostname in ALLOWED
        meta = {**source, "retrieved_at": datetime.now(timezone.utc).isoformat()}
        try:
            with httpx.Client(timeout=90, follow_redirects=False) as client:
                response = client.get(source["url"])
                # Redirects are followed only to the explicit trusted domain list.
                for _ in range(5):
                    if not response.is_redirect:
                        break
                    target = str(response.next_request.url)
                    if urlparse(target).hostname not in ALLOWED:
                        raise ValueError("Unapproved redirect")
                    response = client.get(target)
                response.raise_for_status()
            raw = response.content
            if len(raw) > 35_000_000:
                raise ValueError("Document too large")
            meta["sha256"] = hashlib.sha256(raw).hexdigest()
            is_pdf = raw.startswith(b"%PDF")
            (
                DATA / "raw" / f"{source['id']}.{'pdf' if is_pdf else 'html'}"
            ).write_bytes(raw)
            if is_pdf:
                pages = [
                    (i + 1, p.extract_text() or "")
                    for i, p in enumerate(PdfReader(io.BytesIO(raw)).pages)
                ]
            else:
                soup = BeautifulSoup(raw, "html.parser")
                for tag in soup(["script", "style", "nav", "header", "footer"]):
                    tag.decompose()
                main = (
                    soup.select_one("#divContent")
                    or soup.select_one(".field-name-body")
                    or soup.select_one("#row-content")
                    or soup.select_one("main")
                    or soup
                )
                pages = [(None, main.get_text(" ", strip=True))]
            count = 0
            for page, text in pages:
                for j, part in enumerate(chunks(text)):
                    records.append(
                        {
                            **meta,
                            "id": f"{source['id']}:p{page or 1}:c{j}",
                            "source_id": source["id"],
                            "page": page,
                            "text": part,
                        }
                    )
                    count += 1
            if not count:
                raise ValueError("No extractable text; OCR/review required")
            meta.update(status="indexed", chunk_count=count)
            print(source["id"], count, "chunks", flush=True)
        except Exception as exc:
            meta.update(status="unavailable", error=type(exc).__name__)
            print(
                source["id"], "FAILED", type(exc).__name__, str(exc)[:150], flush=True
            )
        manifest.append(meta)
    if not records:
        raise SystemExit("No sources retrieved; existing corpus retained")
    (DATA / "chunks.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(len(records), "total chunks")


if __name__ == "__main__":
    ingest()
