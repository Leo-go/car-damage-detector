from app.models.schemas import DamageClass, Detection, DetectionSummary, Severity


# Rough RUB ranges used for MVP cost heuristics
COST_BY_CLASS = {
    DamageClass.SCRATCH: (3_000, 12_000),
    DamageClass.DENT: (8_000, 25_000),
    DamageClass.BROKEN: (15_000, 60_000),
}


def estimate_severity(detections: list[Detection]) -> Severity:
    if not detections:
        return "low"
    total_area = sum(d.area_cm2 for d in detections)
    max_conf = max(d.confidence for d in detections)
    broken = sum(1 for d in detections if d.class_ == DamageClass.BROKEN)

    if broken >= 1 or total_area >= 400 or len(detections) >= 6:
        return "high"
    if total_area >= 80 or len(detections) >= 3 or max_conf >= 0.75:
        return "medium"
    return "low"


def estimate_repair_cost(detections: list[Detection], severity: Severity) -> str:
    if not detections:
        return "0 RUB"

    low = 0
    high = 0
    for det in detections:
        base_low, base_high = COST_BY_CLASS[det.class_]
        # Scale lightly by area (cap multiplier)
        area_factor = min(max(det.area_cm2 / 50.0, 0.6), 2.5)
        low += int(base_low * area_factor * det.confidence)
        high += int(base_high * area_factor * det.confidence)

    severity_mult = {"low": 0.85, "medium": 1.0, "high": 1.25}[severity]
    low = int(low * severity_mult)
    high = int(high * severity_mult)
    # Round to nicer brackets
    low = max(1_000, round(low, -3))
    high = max(low + 2_000, round(high, -3))
    return f"{low}-{high} RUB"


def build_summary(detections: list[Detection]) -> DetectionSummary:
    severity = estimate_severity(detections)
    return DetectionSummary(
        total_damages=len(detections),
        severity=severity,
        estimated_repair_cost=estimate_repair_cost(detections, severity),
    )
