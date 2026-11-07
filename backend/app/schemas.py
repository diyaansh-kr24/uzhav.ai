from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

District = Literal["Thanjavur", "Tiruvarur", "Nagapattinam"]
Stage = Literal["coverage", "documents", "reporting", "follow_up", "grievance"]
Language = Literal["en", "ta"]


class CaseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    district: District = "Thanjavur"
    crop: Literal["Paddy"] = "Paddy"
    season: Literal["Not specified", "Kuruvai 2026", "Samba / Thaladi 2026–27"] = (
        "Not specified"
    )
    stage: Stage = "coverage"
    documents: list[
        Literal["policy", "land", "sowing", "bank", "loss_photos", "acknowledgement"]
    ] = Field(default_factory=list, max_length=6)


class ChatInput(BaseModel):
    question: str = Field(min_length=3, max_length=1600)
    language: Language = "en"
    consent: bool = False


class Claim(BaseModel):
    text: str = Field(min_length=1, max_length=900)
    citation_ids: list[str] = Field(min_length=1, max_length=4)
    quotes: list[str] = Field(min_length=1, max_length=4)


class Generation(BaseModel):
    status: Literal["answered", "needs_review", "out_of_scope"]
    claims: list[Claim] = Field(default_factory=list, max_length=4)
    actions: list[Claim] = Field(default_factory=list, max_length=3)
    missing_information: list[str] = Field(default_factory=list, max_length=4)


class ReviewInput(BaseModel):
    response: str = Field(min_length=10, max_length=1800)
    citation_ids: list[str] = Field(min_length=1, max_length=8)


class EventInput(BaseModel):
    kind: Literal[
        "documents_prepared",
        "loss_reported",
        "follow_up_recorded",
        "grievance_prepared",
    ]
