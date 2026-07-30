from io import BytesIO

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_SIDE = 1280


async def read_and_validate_image(file: UploadFile) -> tuple[bytes, str]:
    filename = file.filename or "upload.jpg"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_CONTENT_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Only JPG and PNG are allowed.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.max_upload_mb} MB.",
        )

    # Verify bytes are a real image
    try:
        with Image.open(BytesIO(data)) as img:
            img.verify()
        with Image.open(BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            if fmt not in {"JPEG", "PNG"}:
                raise ValueError(f"format={fmt}")
    except Exception as exc:  # noqa: BLE001
        logger.info("Invalid image upload rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Only JPG and PNG are allowed.",
        ) from exc

    return data, filename


def bytes_to_bgr(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image.",
        )
    return image


def resize_keep_aspect(image: np.ndarray, max_side: int = MAX_SIDE) -> np.ndarray:
    h, w = image.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return image
    scale = max_side / longest
    new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


def preprocess(data: bytes) -> np.ndarray:
    """Decode → BGR ndarray → resize for inference."""
    image = bytes_to_bgr(data)
    return resize_keep_aspect(image)


def pixels_to_cm2(area_px: float, image_width_px: int) -> float:
    """Convert pixel area to cm² using reference car body width."""
    if image_width_px <= 0:
        return 0.0
    cm_per_px = settings.reference_width_cm / image_width_px
    return round(area_px * (cm_per_px**2), 2)
