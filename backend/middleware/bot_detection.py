"""Middleware that blocks obvious bots and flags suspicious requests."""

import sentry_sdk
import structlog
from slowapi.util import get_ipaddr
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from core.config import settings

logger = structlog.get_logger()

_SKIP_PATHS = {"/health", "/health/deep"}
_BROWSER_HEADERS = ("accept", "accept-language", "accept-encoding")


class BotDetectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        if not settings.bot_detection_enabled:
            return await call_next(request)

        path = request.url.path
        if path in _SKIP_PATHS:
            return await call_next(request)

        ua = request.headers.get("user-agent", "")
        verdict = self._classify(ua, request)

        if verdict == "blocked":
            logger.warning(
                "bot_blocked",
                event_type="bot_detection",
                action="blocked",
                user_agent=ua[:200],
                ip=get_ipaddr(request),
                path=path,
                method=request.method,
            )
            sentry_sdk.add_breadcrumb(
                category="bot_detection",
                message=f"Blocked bot: {path}",
                level="warning",
                data={"user_agent": ua[:200], "ip": get_ipaddr(request)},
            )
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        if verdict == "suspicious":
            logger.info(
                "bot_suspicious",
                event_type="bot_detection",
                action="suspicious",
                user_agent=ua[:200],
                ip=get_ipaddr(request),
                path=path,
                method=request.method,
            )
            sentry_sdk.add_breadcrumb(
                category="bot_detection",
                message=f"Suspicious request: {path}",
                level="info",
                data={"user_agent": ua[:200]},
            )
            response = await call_next(request)
            response.headers["X-Bot-Suspect"] = "1"
            return response

        return await call_next(request)

    def _classify(self, ua: str, request: Request) -> str:
        """Classify a request as 'blocked', 'suspicious', or 'ok'."""
        if not ua.strip():
            return "blocked"

        ua_lower = ua.lower()

        for allowed in settings.bot_ua_allowlist:
            if allowed.lower() in ua_lower:
                return "ok"

        for blocked in settings.bot_ua_blocklist:
            if blocked.lower() in ua_lower:
                return "blocked"

        missing_count = sum(
            1 for h in _BROWSER_HEADERS if h not in request.headers
        )
        if missing_count >= 1:
            return "suspicious"

        return "ok"
