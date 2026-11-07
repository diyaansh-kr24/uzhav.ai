"""Turn guided-intake answers into one well-formed question for the answer pipeline.

The wording deliberately avoids terms (premium, deadline, eligible, insurer...) that the
notification guard treats as requests for village-specific figures, while still asking
for the practical next steps, documents and time limits the sources do describe.
"""

STAGE_FOR = {
    "enrol": "coverage",
    "damaged": "reporting",
    "waiting": "follow_up",
    "problem": "grievance",
}

CAUSE = {
    "flood": "flooding or heavy rain",
    "cyclone": "a cyclone",
    "drought": "drought or lack of water",
    "pest": "pests or disease",
    "other": "a natural cause",
}

WHEN = {
    "under_3_days": "less than 3 days ago",
    "3_to_14_days": "between 3 and 14 days ago",
    "over_14_days": "more than 14 days ago",
    "harvested": "after harvest while the crop was drying in the field",
}

LOANEE = {
    "yes": "I have a crop loan (KCC) from a bank",
    "no": "I do not have a crop loan from a bank",
    "unsure": "I am not sure whether my bank enrolled me through a crop loan",
}


def plan_question(p):
    district = p["district"]
    season = p.get("season") or "Not specified"
    season_text = "" if season == "Not specified" else f" for the {season} season"
    loan = LOANEE.get(p.get("loanee") or "unsure")
    s = p.get("situation")
    if s == "damaged":
        cause = CAUSE.get(p.get("damage_cause") or "other")
        when = WHEN.get(p.get("damage_when") or "under_3_days")
        return (
            f"My paddy crop in {district} district{season_text} was damaged by {cause} "
            f"{when}. {loan}. How and where should I report this crop loss, within what "
            "time limit, and which documents should I keep ready?"
        )
    if s == "waiting":
        return (
            f"I have already reported a paddy crop loss in {district} district{season_text}. "
            f"{loan}. How do I follow up on my claim and what records should I keep?"
        )
    if s == "problem":
        return (
            f"I have a problem with my paddy crop insurance claim in {district} "
            f"district{season_text}: it was rejected, delayed or the settlement looks wrong. "
            f"{loan}. How do I raise a grievance and whom should I approach?"
        )
    return (
        f"I grow paddy in {district} district{season_text}. {loan}. How do I enrol in "
        "crop insurance under PMFBY, where do I apply and which documents do I need?"
    )
