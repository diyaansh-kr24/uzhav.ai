import re

TAMIL = re.compile(r"[\u0b80-\u0bff]")


def redact(text):
    text = re.sub(r"\b(?:\d[ -]?){12}\b", "[identity number removed]", text)
    text = re.sub(r"\b[6-9]\d{9}\b", "[phone removed]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[email removed]", text)
    text = re.sub(r"\b\d{9,18}\b", "[account/reference removed]", text)
    return text


def injection(text):
    return bool(
        re.search(
            r"ignore.{0,35}(instructions|rules|previous)|system\s*prompt|reveal.{0,20}(secret|key)|bypass.{0,20}(guard|safety)|<\|?(system|assistant)",
            text,
            re.I,
        )
    )


def needs_notification(text):
    return bool(
        re.search(
            r"deadline|last date|premium|how much|payout|compensation|sum insured|notified|eligible|qualify|covered this|current coverage|enrol.{0,20}(date|open)|insurer|insurance company",
            text,
            re.I,
        )
    )


def decision_claim(text):
    return bool(
        re.search(
            r"you (are|will be) (eligible|covered|approved)|guarantee|you will (receive|get|be paid)|claim (is|has been) approved",
            text,
            re.I,
        )
    )


def normalize(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def validate_claims(answer, evidence):
    by_id = {x["id"]: x for x in evidence}
    claims = answer.claims + answer.actions
    if answer.status != "answered" or not answer.claims:
        return False
    for claim in claims:
        if decision_claim(claim.text):
            return False
        if any(i not in by_id for i in claim.citation_ids):
            return False
        material = " ".join(by_id[i]["text"] for i in claim.citation_ids)
        if any(
            len(q.strip()) < 12 or normalize(q) not in normalize(material)
            for q in claim.quotes
        ):
            return False
        # Prevent invented amounts, durations and dates even when a citation exists.
        if set(re.findall(r"\d+", claim.text)) - set(re.findall(r"\d+", material)):
            return False
    return True
