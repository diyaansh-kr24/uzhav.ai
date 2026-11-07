"""Local hybrid retrieval: BM25 + character TF-IDF, optional cached dense index.
Scores are ranking heuristics, not probabilities of correctness.
"""

import json, math, re
from collections import Counter
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from .config import DATA, setting
from .providers import embeddings

STOP = set(
    "the a an is are was were how what when where why my i me to for of in on and or can do does it this that you your please with".split()
)


def tokens(s):
    return [w for w in re.findall(r"[a-z]{2,}", s.lower()) if w not in STOP]


class Retriever:
    def __init__(self, records=None):
        path = DATA / "chunks.json"
        self.rows = (
            records
            if records is not None
            else json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        )
        self.vectorizer = None
        self.dense = None
        if not self.rows:
            return
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(3, 5), max_features=45000
        )
        self.matrix = self.vectorizer.fit_transform([r["text"] for r in self.rows])
        self.counts = [Counter(tokens(r["text"])) for r in self.rows]
        self.lengths = np.array([sum(c.values()) for c in self.counts])
        self.avg = max(float(self.lengths.mean()), 1)
        df = Counter(w for c in self.counts for w in c)
        self.idf = {
            w: math.log(1 + (len(self.rows) - n + 0.5) / (n + 0.5))
            for w, n in df.items()
        }
        dense_path = DATA / "dense.json"
        if dense_path.exists() and setting("EMBEDDING_MODEL"):
            dense = json.loads(dense_path.read_text())
            if dense["model"] == setting("EMBEDDING_MODEL") and dense["ids"] == [
                r["id"] + r["sha256"] for r in self.rows
            ]:
                self.dense = np.array(dense["vectors"], dtype=np.float32)
                self.dense /= np.maximum(
                    np.linalg.norm(self.dense, axis=1, keepdims=True), 1e-9
                )

    async def search(self, query, district, k=5):
        if not self.rows:
            return []
        # Mandatory scope filter BEFORE ranking. Archives never answer current questions.
        eligible = [
            i
            for i, r in enumerate(self.rows)
            if r["kind"] != "archive"
            and (district in r["districts"] or "all" in r["districts"])
        ]
        words = tokens(query)
        bm = np.zeros(len(self.rows))
        for w in set(words):
            tf = np.array([c.get(w, 0) for c in self.counts])
            den = tf + 1.5 * (0.25 + 0.75 * self.lengths / self.avg)
            bm += self.idf.get(w, 0) * tf * 2.5 / np.maximum(den, 1e-9)
        lexical = (self.matrix @ self.vectorizer.transform([query]).T).toarray().ravel()
        signals = [bm, lexical]
        if self.dense is not None:
            v = np.array((await embeddings([query]))[0])
            v /= max(np.linalg.norm(v), 1e-9)
            signals.append(self.dense @ v)
        fused = {i: 0.0 for i in eligible}
        for scores in signals:
            for rank, i in enumerate(
                sorted(eligible, key=lambda j: scores[j], reverse=True)[:40]
            ):
                if scores[i] > 0:
                    fused[i] += 1 / (60 + rank + 1)
        ranked = sorted(eligible, key=lambda i: fused[i], reverse=True)
        result = []
        per_page = Counter()
        for i in ranked:
            r = self.rows[i]
            page = (r["source_id"], r["page"])
            if per_page[page] >= 2:
                continue
            if bm[i] < 0.2 or lexical[i] < 0.025:
                continue
            per_page[page] += 1
            result.append(
                {
                    **r,
                    "rank_score": round(fused[i], 5),
                    "lexical_score": round(float(lexical[i]), 4),
                    "term_matches": len(set(words) & set(self.counts[i])),
                }
            )
            if len(result) == k:
                break
        return result
