"""Optional Roboflow hosted model detector."""

from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request

import cv2
import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import DamageClass, Detection
from app.services.preprocess import pixels_to_cm2
from app.services.yolo_detector import CLASS_ALIASES

logger = get_logger(__name__)


class RoboflowDetector:
    def __init__(self) -> None:
        self.error: str | None = None
        if not settings.roboflow_api_key:
            self.error = "ROBOFLOW_API_KEY not configured"
        if not settings.roboflow_model_id:
            self.error = (self.error + "; " if self.error else "") + "ROBOFLOW_MODEL_ID not configured"

    @property
    def ready(self) -> bool:
        return self.error is None

    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        if not self.ready:
            raise RuntimeError(self.error)

        ok, buf = cv2.imencode(".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not ok:
            raise RuntimeError("Failed to encode image for Roboflow")

        encoded = base64.b64encode(buf.tobytes()).decode("ascii")
        model = settings.roboflow_model_id.strip("/")
        query = urllib.parse.urlencode(
            {
                "api_key": settings.roboflow_api_key,
                "confidence": int(settings.confidence_threshold * 100),
            }
        )
        url = (
            f"{settings.roboflow_api_url.rstrip('/')}/{model}"
            f"/{settings.roboflow_version}?{query}"
        )
        req = urllib.request.Request(
            url,
            data=encoded.encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Roboflow API error {exc.code}: {body}") from exc

        h, w = image_bgr.shape[:2]
        detections: list[Detection] = []
        for pred in payload.get("predictions", []):
            label = str(pred.get("class", "")).lower().strip()
            damage_class = CLASS_ALIASES.get(label)
            if damage_class is None:
                continue
            conf = float(pred.get("confidence", 0))
            # Roboflow returns center x,y + width/height
            cx = float(pred.get("x", 0))
            cy = float(pred.get("y", 0))
            bw = float(pred.get("width", 0))
            bh = float(pred.get("height", 0))
            x1, y1 = cx - bw / 2, cy - bh / 2
            x2, y2 = cx + bw / 2, cy + bh / 2
            detections.append(
                Detection.model_validate(
                    {
                        "class": damage_class.value,
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2],
                        "area_cm2": pixels_to_cm2(bw * bh, w),
                    }
                )
            )
        return detections
