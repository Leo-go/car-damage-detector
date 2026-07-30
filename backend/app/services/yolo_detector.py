"""YOLOv8 detector via Ultralytics (optional dependency)."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import DamageClass, Detection
from app.services.preprocess import pixels_to_cm2

logger = get_logger(__name__)

CLASS_ALIASES: dict[str, DamageClass] = {
    "scratch": DamageClass.SCRATCH,
    "scratches": DamageClass.SCRATCH,
    "dent": DamageClass.DENT,
    "dents": DamageClass.DENT,
    "broken": DamageClass.BROKEN,
    "broken_parts": DamageClass.BROKEN,
    "crack": DamageClass.BROKEN,
    "paint": DamageClass.SCRATCH,
    "paint_damage": DamageClass.SCRATCH,
}


class YoloDetector:
    def __init__(self) -> None:
        self.model = None
        self.error: str | None = None
        self._try_load()

    def _try_load(self) -> None:
        path = Path(settings.model_path)
        if not path.exists():
            self.error = f"Model file not found: {path}"
            logger.warning(self.error)
            return
        try:
            from ultralytics import YOLO

            self.model = YOLO(str(path))
            logger.info("YOLOv8 model loaded from %s", path)
        except Exception as exc:  # noqa: BLE001
            self.error = str(exc)
            self.model = None
            logger.warning("Failed to load YOLO: %s", exc)

    @property
    def ready(self) -> bool:
        return self.model is not None

    def detect(self, image_bgr: np.ndarray) -> list[Detection]:
        if self.model is None:
            raise RuntimeError(self.error or "YOLO model not loaded")

        h, w = image_bgr.shape[:2]
        results = self.model.predict(
            source=image_bgr,
            conf=settings.confidence_threshold,
            verbose=False,
        )
        if not results:
            return []

        result = results[0]
        names = result.names or {}
        boxes = result.boxes
        if boxes is None:
            return []

        detections: list[Detection] = []
        for box in boxes:
            cls_id = int(box.cls.item())
            conf = float(box.conf.item())
            raw = str(names.get(cls_id, cls_id)).lower().strip()
            damage_class = CLASS_ALIASES.get(raw)
            if damage_class is None:
                continue
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            area_px = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            detections.append(
                Detection.model_validate(
                    {
                        "class": damage_class.value,
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2],
                        "area_cm2": pixels_to_cm2(area_px, w),
                    }
                )
            )
        return detections
