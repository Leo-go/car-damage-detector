"""In-memory sliding-window rate limiter.

Without a valid API key: N requests / hour / client IP.
With a valid X-API-Key: higher limit (or configured key quota).
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Header, HTTPException, Request, status

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int = 3600) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = int(window_seconds - (now - bucket[0])) + 1
                return False, max(retry_after, 1)
            bucket.append(now)
            return True, 0


rate_limiter = RateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def enforce_rate_limit(
    request: Request,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    has_valid_key = bool(settings.api_key) and x_api_key == settings.api_key
    # Also accept key without server-side API_KEY configured as "present but unverified" → anonymous
    if has_valid_key:
        limit = settings.rate_limit_with_key_per_hour
        bucket_key = f"key:{x_api_key}"
    else:
        if x_api_key and settings.api_key and x_api_key != settings.api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        limit = settings.rate_limit_per_hour
        bucket_key = f"ip:{client_ip(request)}"

    allowed, retry_after = rate_limiter.check(bucket_key, limit)
    if not allowed:
        logger.warning("Rate limit exceeded for %s (limit=%s/h)", bucket_key, limit)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {limit} requests per hour without a valid API key"
            if not has_valid_key
            else f"Rate limit exceeded: {limit} requests per hour",
            headers={"Retry-After": str(retry_after)},
        )
