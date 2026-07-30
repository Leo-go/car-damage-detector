import time

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core.logging import get_logger
from app.core.rate_limit import enforce_rate_limit
from app.models.schemas import DetectResponse, ReportRequest, ReportResponse
from app.services.detector import detector_service
from app.services.preprocess import read_and_validate_image
from app.services.report import generate_text_report

logger = get_logger(__name__)

api_router = APIRouter(prefix="/api", dependencies=[Depends(enforce_rate_limit)])
health_router = APIRouter()


@health_router.get("/health")
async def health() -> dict:
    status = detector_service.status()
    return {
        "status": "ok",
        "service": "car-damage-detector",
        **status,
    }


@api_router.post("/detect", response_model=DetectResponse)
async def detect(
    request: Request,
    file: UploadFile = File(...),
) -> DetectResponse:
    started = time.perf_counter()
    data, filename = await read_and_validate_image(file)
    logger.info(
        "detect request ip=%s filename=%s size=%s content_type=%s",
        request.client.host if request.client else "unknown",
        filename,
        len(data),
        file.content_type,
    )

    result = detector_service.detect(data)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "detect done filename=%s damages=%s severity=%s backend=%s elapsed_ms=%.1f",
        filename,
        result.summary.total_damages,
        result.summary.severity,
        (result.meta or {}).get("backend"),
        elapsed_ms,
    )
    return result


@api_router.post("/report", response_model=ReportResponse)
async def report(payload: ReportRequest, request: Request) -> ReportResponse:
    logger.info(
        "report request ip=%s damages=%s lang=%s",
        request.client.host if request.client else "unknown",
        payload.summary.total_damages,
        payload.language,
    )
    text = generate_text_report(payload)
    return ReportResponse(report=text, format="text")
