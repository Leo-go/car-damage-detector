"""Orchestrates YOLO / Roboflow / HuggingFace / OpenCV detection backends."""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger
from app.models.schemas import DetectResponse
from app.services.hf_detector import HuggingFaceDetector
from app.services.opencv_detector import detect_opencv
from app.services.preprocess import preprocess
from app.services.roboflow_detector import RoboflowDetector
from app.services.summary import build_summary
from app.services.yolo_detector import YoloDetector

logger = get_logger(__name__)


class DamageDetectorService:
    def __init__(self) -> None:
        self.yolo = YoloDetector()
        self.hf = HuggingFaceDetector()
        self.roboflow = RoboflowDetector()

    def status(self) -> dict:
        return {
            "backend_preference": settings.detector_backend,
            "active_backend": self._resolve_backend_name(),
            "yolo_ready": self.yolo.ready,
            "yolo_error": self.yolo.error,
            "hf_ready": self.hf.ready,
            "hf_error": self.hf.error,
            "roboflow_ready": self.roboflow.ready,
            "roboflow_error": self.roboflow.error,
            "opencv_ready": True,
        }

    def _resolve_backend_name(self) -> str:
        pref = settings.detector_backend
        if pref == "yolo" and self.yolo.ready:
            return "yolo"
        if pref == "roboflow" and self.roboflow.ready:
            return "roboflow"
        if pref == "huggingface" and self.hf.ready:
            return "huggingface"
        if pref == "opencv":
            return "opencv"
        if pref == "auto":
            if self.yolo.ready:
                return "yolo"
            if self.roboflow.ready:
                return "roboflow"
            if self.hf.ready:
                return "huggingface"
            return "opencv"
        # Forced backend not ready → fall back
        return "opencv"

    def detect(self, image_bytes: bytes) -> DetectResponse:
        image = preprocess(image_bytes)
        backend = self._resolve_backend_name()
        logger.info("Running detection with backend=%s", backend)

        try:
            if backend == "yolo":
                detections = self.yolo.detect(image)
            elif backend == "roboflow":
                detections = self.roboflow.detect(image)
            elif backend == "huggingface":
                detections = self.hf.detect(image)
            else:
                detections = detect_opencv(image)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Primary backend %s failed: %s", backend, exc)
            if backend != "opencv":
                logger.info("Falling back to OpenCV detector")
                detections = detect_opencv(image)
                backend = "opencv"
            else:
                raise

        summary = build_summary(detections)
        return DetectResponse(
            detections=detections,
            summary=summary,
            meta={
                "backend": backend,
                "image_width": int(image.shape[1]),
                "image_height": int(image.shape[0]),
            },
        )


detector_service = DamageDetectorService()
