"""Conversational chat mode, with a stubbed model and a tiny in-memory corpus."""

import asyncio
import pytest
from app import chat
from app.retrieval import Retriever

TEXT = "Farmers should report crop loss within 72 hours through the Krishi Rakshak Portal and Helpline."
ROWS = [{
    "id": "doc:p1:c0", "source_id": "doc", "title": "Guidelines", "url": "https://example.gov/doc.pdf",
    "page": 1, "text": TEXT, "kind": "framework", "published": None,
    "retrieved_at": "2026-11-07", "sha256": "x", "districts": ["all"],
}]
PROFILE = {"district": "Thanjavur", "crop": "Paddy", "season": "Kuruvai 2026", "stage": "reporting", "documents": []}


def talk(monkeypatch, reply, question="how do I report crop loss", history=()):
    calls = []

    async def complete(system, user):
        calls.append(user)
        return reply if isinstance(reply, dict) else reply[len(calls) - 1]

    monkeypatch.setattr(chat, "completion", complete)
    monkeypatch.setattr(chat, "configured", lambda _: True)
    out = asyncio.run(chat.converse(question, "en", PROFILE, list(history), Retriever(ROWS)))
    return out, calls


def test_small_talk_needs_no_sources(monkeypatch):
    out, _ = talk(monkeypatch, {"reply": "Hello! What happened to your crop?", "sources": [], "needs_human": False,
                                "suggested_reply": "My crop got flooded"}, question="hi")
    assert out["status"] == "answered" and out["evidence"] == [] and out["suggested_reply"] == "My crop got flooded"


def test_sourced_fact_passes_and_orders_evidence(monkeypatch):
    out, _ = talk(monkeypatch, {"reply": "Report within 72 hours [1]. Did you report it yet?",
                                "sources": [{"id": "doc:p1:c0", "quote": "report crop loss within 72 hours"}]})
    assert out["status"] == "answered" and [e["id"] for e in out["evidence"]] == ["doc:p1:c0"]


def test_bad_quote_is_salvaged_keeping_conversation(monkeypatch):
    bad = {"reply": "Report within 72 hours [1]. Did you report it yet?",
           "sources": [{"id": "doc:p1:c0", "quote": "a sentence that is not in the document"}]}
    out, calls = talk(monkeypatch, [bad, bad])
    assert len(calls) == 2  # one repair attempt
    assert out["status"] == "answered" and out["answer"] == "Did you report it yet?" and out["evidence"] == []


def test_invented_number_goes_to_review(monkeypatch):
    bad = {"reply": "You will get 5000 rupees.", "sources": []}
    out, _ = talk(monkeypatch, [bad, bad])
    assert out["status"] == "needs_review" and "5000" not in out["answer"]


def test_model_can_ask_for_human(monkeypatch):
    out, _ = talk(monkeypatch, {"reply": "I don't have that in the documents.", "sources": [], "needs_human": True})
    assert out["status"] == "needs_review"


def test_history_reaches_model(monkeypatch):
    hist = [{"question": "my crop flooded", "result": {"answer": "When did it happen?"}}]
    _, calls = talk(monkeypatch, {"reply": "Thanks. Report it soon.", "sources": []}, "two days ago", hist)
    assert "my crop flooded" in calls[0] and "When did it happen?" in calls[0]
