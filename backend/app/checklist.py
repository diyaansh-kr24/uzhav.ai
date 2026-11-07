"""Turn a grounded plan into a short checklist of actionable steps.

The checklist is a rewrite of the plan's already-verified points, not new advice:
steps may not introduce numbers that are absent from the plan, and promises of
eligibility/approval/payment are rejected. No citations are shown to the farmer.
"""

import json, logging, re
from . import guards
from .providers import completion, translate, ProviderError

log = logging.getLogger("uvicorn.error")

SYSTEM = """You turn a crop-insurance plan into a simple checklist for a paddy farmer.
Use ONLY the points in the plan. Do not add any new fact, number, phone number, deadline or channel.
Include ONLY things the FARMER personally does (call, visit, report, keep, carry, ask, check). Skip anything that officials, banks, insurers, assessors or committees do; if useful, turn it into what the farmer should do (e.g. "Be available when the assessor visits your field").
Write 3 to 6 steps, in the order the farmer should do them. Each step: one short imperative sentence (under 20 words), plain words, no citations, no brackets.
Never promise eligibility, approval or payment.
Return only JSON: {"steps": ["...", "..."]}"""


def _numbers(text):
    return set(re.findall(r"\d+", text))


async def make_checklist(result, language):
    """Return a list of step strings, or [] if the plan has nothing usable."""
    points = [c["text"] for c in result.get("claims", []) + result.get("actions", [])]
    english = [c.get("original_text") or c["text"] for c in result.get("claims", []) + result.get("actions", [])]
    if result.get("status") != "answered" or not english:
        return []
    try:
        out = await completion(SYSTEM, json.dumps({"plan_points": english}, ensure_ascii=False))
        steps = [" ".join(str(s).split()) for s in out.get("steps", []) if str(s).strip()][:6]
    except ProviderError as exc:
        log.warning("Checklist generation failed: %s", exc)
        steps = []
    allowed = _numbers(" ".join(english))
    steps = [re.sub(r"\s*\[\d+\]", "", s) for s in steps]
    steps = [s for s in steps if s and not (_numbers(s) - allowed) and not guards.decision_claim(s)]
    if not steps:
        # Fall back to the plan's own verified points, without citations.
        return points[:6]
    if language == "ta":
        try:
            translated = [await translate(s, "en-IN", "ta-IN") for s in steps]
            if all(_numbers(t) == _numbers(s) for t, s in zip(translated, steps)):
                return translated
        except ProviderError as exc:
            log.warning("Checklist translation failed: %s", exc)
        return points[:6]
    return steps
