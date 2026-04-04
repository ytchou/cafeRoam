from typing import Any

from fastapi import APIRouter, Depends, Request

from api.deps import require_admin
from middleware.rate_limit import limiter
from workers.scheduler import get_scheduler_status

router = APIRouter()


@limiter.exempt  # type: ignore[misc]
@router.get("/health/scheduler")
async def scheduler_health(
    request: Request,
    _: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, object]:
    """Scheduler health — registered jobs, next run times, last poll timestamp.
    Requires admin auth; not used by Railway's liveness checker (which hits /health)."""
    return get_scheduler_status(request.app.state.scheduler)


@limiter.exempt  # type: ignore[misc]
@router.get("/health/sentry-debug")
async def sentry_debug(
    _: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    """Intentionally raises to verify Sentry captures unhandled exceptions. Admin-only."""
    raise RuntimeError("Sentry debug test — if you see this in Sentry, it's working.")
