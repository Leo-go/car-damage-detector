from app.models.schemas import Detection, DetectionSummary, ReportRequest


def generate_text_report(payload: ReportRequest) -> str:
    if payload.language == "en":
        return _report_en(payload.detections, payload.summary, payload.filename)
    return _report_ru(payload.detections, payload.summary, payload.filename)


def _report_ru(
    detections: list[Detection],
    summary: DetectionSummary,
    filename: str | None,
) -> str:
    lines = [
        "Отчёт о повреждениях автомобиля",
        "=" * 36,
    ]
    if filename:
        lines.append(f"Файл: {filename}")
    lines.extend(
        [
            f"Всего повреждений: {summary.total_damages}",
            f"Серьёзность: {summary.severity}",
            f"Оценка ремонта: {summary.estimated_repair_cost}",
            "",
            "Детекции:",
        ]
    )
    if not detections:
        lines.append("  — повреждений не обнаружено")
    else:
        for i, det in enumerate(detections, start=1):
            x1, y1, x2, y2 = det.bbox
            lines.append(
                f"  {i}. {det.class_.value} | confidence={det.confidence:.2f} | "
                f"bbox=[{x1:.0f}, {y1:.0f}, {x2:.0f}, {y2:.0f}] | "
                f"area≈{det.area_cm2:.1f} cm²"
            )
    lines.extend(
        [
            "",
            "Примечание: оценка носит ориентировочный характер и не является официальной калькуляцией СТО.",
        ]
    )
    return "\n".join(lines)


def _report_en(
    detections: list[Detection],
    summary: DetectionSummary,
    filename: str | None,
) -> str:
    lines = [
        "Car Damage Detection Report",
        "=" * 36,
    ]
    if filename:
        lines.append(f"File: {filename}")
    lines.extend(
        [
            f"Total damages: {summary.total_damages}",
            f"Severity: {summary.severity}",
            f"Estimated repair cost: {summary.estimated_repair_cost}",
            "",
            "Detections:",
        ]
    )
    if not detections:
        lines.append("  — no damage detected")
    else:
        for i, det in enumerate(detections, start=1):
            x1, y1, x2, y2 = det.bbox
            lines.append(
                f"  {i}. {det.class_.value} | confidence={det.confidence:.2f} | "
                f"bbox=[{x1:.0f}, {y1:.0f}, {x2:.0f}, {y2:.0f}] | "
                f"area≈{det.area_cm2:.1f} cm²"
            )
    lines.extend(
        [
            "",
            "Note: cost estimate is approximate and not an official workshop quote.",
        ]
    )
    return "\n".join(lines)
