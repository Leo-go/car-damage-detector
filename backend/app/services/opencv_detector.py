"""OpenCV heuristic detector (edges + contours) — Variant B fallback."""

from __future__ import annotations

import cv2
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import DamageClass, Detection
from app.services.preprocess import pixels_to_cm2

logger = get_logger(__name__)


def _classify_contour(w: int, h: int, area: float) -> tuple[DamageClass, float]:
    aspect = max(w, h) / max(min(w, h), 1)
    if aspect >= 3.2:
        return DamageClass.SCRATCH, min(0.55 + min(aspect / 20, 0.25), 0.85)
    if area > 8_000 and aspect < 2.0:
        return DamageClass.BROKEN, min(0.50 + min(area / 40_000, 0.30), 0.82)
    return DamageClass.DENT, min(0.45 + min(area / 20_000, 0.30), 0.80)


def detect_opencv(image_bgr: np.ndarray) -> list[Detection]:
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 160)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (w * h) * 0.0015
    max_area = (w * h) * 0.25
    detections: list[Detection] = []

    for contour in contours:
        area = float(cv2.contourArea(contour))
        if area < min_area or area > max_area:
            continue

        x, y, bw, bh = cv2.boundingRect(contour)
        # Skip near-full-frame boxes / border noise
        if bw > w * 0.9 or bh > h * 0.9:
            continue
        if x < 2 or y < 2 or x + bw > w - 2 or y + bh > h - 2:
            # soft filter for border artifacts
            if bw * bh > (w * h) * 0.08:
                continue

        damage_class, confidence = _classify_contour(bw, bh, area)
        if confidence < settings.confidence_threshold:
            continue

        detections.append(
            Detection.model_validate(
                {
                    "class": damage_class.value,
                    "confidence": round(float(confidence), 3),
                    "bbox": [float(x), float(y), float(x + bw), float(y + bh)],
                    "area_cm2": pixels_to_cm2(float(bw * bh), w),
                }
            )
        )

    # Keep strongest / non-overlapping-ish boxes
    detections.sort(key=lambda d: d.confidence, reverse=True)
    filtered: list[Detection] = []
    for det in detections:
        if len(filtered) >= 12:
            break
        if any(_iou(det.bbox, kept.bbox) > 0.45 for kept in filtered):
            continue
        filtered.append(det)

    logger.info("OpenCV detector found %s candidate damages", len(filtered))
    return filtered


def _iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0
