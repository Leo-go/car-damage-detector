from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DamageClass(str, Enum):
    SCRATCH = "scratch"
    DENT = "dent"
    BROKEN = "broken"


Severity = Literal["low", "medium", "high"]


class Detection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_: DamageClass = Field(alias="class")
    confidence: float = Field(ge=0, le=1)
    bbox: list[float] = Field(min_length=4, max_length=4, description="[x1, y1, x2, y2]")
    area_cm2: float = Field(ge=0)


class DetectionSummary(BaseModel):
    total_damages: int
    severity: Severity
    estimated_repair_cost: str


class DetectResponse(BaseModel):
    detections: list[Detection]
    summary: DetectionSummary
    meta: dict | None = None


class ReportRequest(BaseModel):
    detections: list[Detection]
    summary: DetectionSummary
    filename: str | None = None
    language: Literal["ru", "en"] = "ru"


class ReportResponse(BaseModel):
    report: str
    format: Literal["text"] = "text"
