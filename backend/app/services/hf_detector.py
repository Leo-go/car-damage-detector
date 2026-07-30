"""Optional HuggingFace Inference API detector (e.g. facebook/detr-resnet-50)."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

import cv2
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import Detection
from app.services.preprocess import pixels_to_cm2
from app.services.yolo_detector import CLASS_ALIASES

logger = get_logger(__name__)

# Map generic COCO / DETR labels that might indicate damage-like regions
HF_DAMAGE_HINTS = {
    "car": None,  # ignore whole-car boxes
    "truck": None,
    "bus": None,
}


class HuggingFaceDetector:
    def __init__(self) -> None:
        self.error: str | None = None
        if not settings.hf_api_token:
            self.error = "HF_API_TOKEN not configured"
        if not settings.hf_model_id:
            self.error = "HF_MODEL_ID not configured"

    @property
    def ready(self) -> bool:
        return self.error is None

    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        if not self.ready:
            raise RuntimeError(self.error)

        ok, buf = cv2.imencode(".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not ok:
            raise RuntimeError("Failed to encode image for HuggingFace")

        url = f"{settings.hf_api_url.rstrip('/')}/{settings.hf_model_id}"
        req = urllib.request.Request(
            url,
            data=buf.tobytes(),
            headers={
                "Authorization": f"Bearer {settings.hf_api_token}",
                "Content-Type": "image/jpeg",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"HuggingFace API error {exc.code}: {body}") from exc

        h, w = image_bgr.shape[:2]
        detections: list[Detection] = []
        items = payload if isinstance(payload, list) else payload.get("predictions", [])
        for item in items:
            label = str(item.get("label", "")).lower().strip()
            score = float(item.get("score", item.get("confidence", 0)))
            box = item.get("box") or item.get("bbox") or {}
            if isinstance(box, dict):
                x1 = float(box.get("xmin", box.get("x1", 0)))
                y1 = float(box.get("ymin", box.get("y1", 0)))
                x2 = float(box.get("xmax", box.get("x2", 0)))
                y2 = float(box.get("ymax", box.get("y2", 0)))
            elif isinstance(box, (list, tuple)) and len(box) == 4:
                x1, y1, x2, y2 = map(float, box)
            else:
                continue

            damage_class = CLASS_ALIASES.get(label)
            if damage_class is None:
                # Generic object detectors aren't car-damage specific; skip unknown labels
                if label in HF_DAMAGE_HINTS:
                    continue
                continue

            if score < settings.confidence_threshold:
                continue
            area_px = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            detections.append(
                Detection.model_validate(
                    {
                        "class": damage_class.value,
                        "confidence": round(score, 3),
                        "bbox": [x1, y1, x2, y2],
                        "area_cm2": pixels_to_cm2(area_px, w),
                    }
                )
            )
        return detections
