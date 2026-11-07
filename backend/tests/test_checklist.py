"""Checklist rewrite of a grounded plan (stubbed model)."""

import asyncio
from app import checklist

PLAN = {
    "status": "answered",
    "claims": [{"text": "Report crop loss within 72 hours through the Krishi Rakshak helpline.", "citation_ids": ["a"]}],
    "actions": [{"text": "Keep your land record and bank passbook ready.", "citation_ids": ["a"]}],
}


def make(monkeypatch, steps):
    async def complete(system, user):
        return {"steps": steps}

    monkeypatch.setattr(checklist, "completion", complete)
    return asyncio.run(checklist.make_checklist(PLAN, "en"))


def test_steps_returned_without_citations(monkeypatch):
    out = make(monkeypatch, ["Call the Krishi Rakshak helpline within 72 hours [1].", "Keep your land record ready."])
    assert out == ["Call the Krishi Rakshak helpline within 72 hours.", "Keep your land record ready."]


def test_step_with_invented_number_dropped(monkeypatch):
    out = make(monkeypatch, ["Call 1800-000-000 now.", "Keep your land record ready."])
    assert out == ["Keep your land record ready."]


def test_falls_back_to_plan_points(monkeypatch):
    out = make(monkeypatch, [])
    assert out == [PLAN["claims"][0]["text"], PLAN["actions"][0]["text"]]


def test_unanswered_plan_has_no_checklist(monkeypatch):
    assert asyncio.run(checklist.make_checklist({"status": "needs_review", "claims": [], "actions": []}, "en")) == []
