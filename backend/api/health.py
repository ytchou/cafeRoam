from typing import Any

from fastapi import APIRouter, Depends, Request

from api.deps import require_admin
from workers.scheduler import get_scheduler_status

router = APIRouter()


@router.get("/health/scheduler")
async def scheduler_health(
    request: Request,
    _: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, object]:
    """Scheduler health — registered jobs, next run times, last poll timestamp.
    Requires admin auth; not used by Railway's liveness checker (which hits /health)."""
    return get_scheduler_status(request.app.state.scheduler)
