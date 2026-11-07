"""Optional paid dense indexing. Run only with a configured supported embedding model."""

import asyncio, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.config import DATA, setting, configured
from app.providers import embeddings


async def main():
    if not setting("EMBEDDING_MODEL") or not configured("AICREDITS_API_KEY"):
        raise SystemExit("Set EMBEDDING_MODEL and AICREDITS_API_KEY first.")
    rows = json.loads((DATA / "chunks.json").read_text(encoding="utf-8"))
    vectors = []
    for i in range(0, len(rows), 32):
        vectors.extend(await embeddings([r["text"] for r in rows[i : i + 32]]))
        print(min(i + 32, len(rows)), "/", len(rows))
    (DATA / "dense.json").write_text(
        json.dumps(
            {
                "model": setting("EMBEDDING_MODEL"),
                "ids": [r["id"] + r["sha256"] for r in rows],
                "vectors": vectors,
            }
        )
    )


asyncio.run(main())
