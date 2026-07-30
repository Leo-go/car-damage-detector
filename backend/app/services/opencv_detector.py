"""OpenCV heuristic detector (edges + contours) — demo fallback.

Not a trained CV model: elongated high-contrast marks → scratches work OK;
wheels, handles, reflections often become false dents/broken. Tuned to
prefer long horizontal scratches and suppress circular / compact noise.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import DamageClass, Detection
from app.services.preprocess import pixels_to_cm2

logger = get_logger(__name__)


def _circularity(contour: np.ndarray, area: float) -> float:
    peri = cv2.arcLength(contour, True)
    if peri <= 1e-6:
        return 0.0
    return float(4.0 * np.pi * area / (peri * peri))


def _extent(area: float, bw: int, bh: int) -> float:
    box = max(bw * bh, 1)
    return float(area / box)


def _find_wheel_masks(gray: np.ndarray) -> list[tuple[int, int, int]]:
    """Rough wheel detection via HoughCircles to suppress false positives."""
    h, w = gray.shape[:2]
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)
    min_r = max(18, int(min(h, w) * 0.04))
    max_r = max(min_r + 1, int(min(h, w) * 0.22))
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=int(min(h, w) * 0.2),
        param1=120,
        param2=40,
        minRadius=min_r,
        maxRadius=max_r,
    )
    if circles is None:
        return []
    return [(int(x), int(y), int(r)) for x, y, r in circles[0]]


def _overlaps_wheel(x: int, y: int, bw: int, bh: int, wheels: list[tuple[int, int, int]]) -> bool:
    cx, cy = x + bw / 2, y + bh / 2
    for wx, wy, wr in wheels:
        # expand radius a bit — tire + arch edges
        if (cx - wx) ** 2 + (cy - wy) ** 2 <= (wr * 1.35) ** 2:
            return True
        # bbox mostly inside wheel circle
        if abs(cx - wx) < wr * 1.2 and abs(cy - wy) < wr * 1.2 and max(bw, bh) < wr * 2.2:
            return True
    return False


def _classify_contour(
    bw: int,
    bh: int,
    area: float,
    circ: float,
    extent: float,
) -> tuple[DamageClass, float] | None:
    aspect = max(bw, bh) / max(min(bw, bh), 1)
    horizontal = bw >= bh * 1.8

    # Long thin marks → scratch (most trustworthy heuristic)
    if aspect >= 3.5 and extent < 0.55:
        conf = 0.62 + min(aspect / 25.0, 0.22)
        if horizontal:
            conf += 0.06
        return DamageClass.SCRATCH, min(conf, 0.88)

    # Medium elongated
    if aspect >= 2.6 and horizontal and circ < 0.35:
        return DamageClass.SCRATCH, min(0.58 + aspect / 30.0, 0.8)

    # Near-circular / wheel-like → ignore (not damage)
    if circ >= 0.55:
        return None

    # Compact small boxes (handles, badges, reflections) → ignore
    if aspect < 1.8 and area < 3500:
        return None

    # Large irregular blob → broken (rare; keep strict)
    if area > 18_000 and aspect < 1.9 and circ < 0.4 and extent > 0.35:
        return DamageClass.BROKEN, min(0.52 + min(area / 60_000, 0.2), 0.72)

    # Soft dent candidate — only mid-size, not too round
    if 4_000 < area < 25_000 and 1.2 <= aspect <= 2.8 and circ < 0.45:
        return DamageClass.DENT, min(0.48 + min(area / 40_000, 0.18), 0.68)

    return None


def detect_opencv(image_bgr: np.ndarray) -> list[Detection]:
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Slightly higher thresholds → fewer noisy edges
    edges = cv2.Canny(blurred, 80, 180)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

    wheels = _find_wheel_masks(gray)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = (w * h) * 0.0020
    max_area = (w * h) * 0.18
    detections: list[Detection] = []

    for contour in contours:
        area = float(cv2.contourArea(contour))
        if area < min_area or area > max_area:
            continue

        x, y, bw, bh = cv2.boundingRect(contour)
        if bw > w * 0.85 or bh > h * 0.85:
            continue
        if bw < 12 or bh < 8:
            continue

        # Border-touching large regions → often frame noise
        touches_border = x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2
        if touches_border and (bw * bh) > (w * h) * 0.05:
            continue

        if _overlaps_wheel(x, y, bw, bh, wheels):
            continue

        circ = _circularity(contour, area)
        extent = _extent(area, bw, bh)
        classified = _classify_contour(bw, bh, area, circ, extent)
        if classified is None:
            continue

        damage_class, confidence = classified
        if confidence < max(settings.confidence_threshold, 0.45):
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

    # Prefer scratches, then higher confidence; keep fewer boxes for cleaner demo
    priority = {DamageClass.SCRATCH: 0, DamageClass.DENT: 1, DamageClass.BROKEN: 2}
    detections.sort(key=lambda d: (priority[d.class_], -d.confidence))

    filtered: list[Detection] = []
    for det in detections:
        if len(filtered) >= 8:
            break
        if any(_iou(det.bbox, kept.bbox) > 0.35 for kept in filtered):
            continue
        filtered.append(det)

    filtered.sort(key=lambda d: d.confidence, reverse=True)
    logger.info(
        "OpenCV detector found %s damages (wheels_suppressed=%s)",
        len(filtered),
        len(wheels),
    )
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
