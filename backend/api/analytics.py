from typing import Any

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
from supabase import Client

from api.deps import get_admin_db, get_current_user
from core.anonymize import anonymize_user_id
from core.config import settings
from models.analytics_events import (
    SPEC_EVENTS,
    AnalyticsEventRequest,
    sanitize_passthrough,
)
from providers.analytics import get_analytics_provider
from providers.analytics.interface import AnalyticsProvider
from services.checkin_service import CheckInService

logger = structlog.get_logger()
router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _enrich_checkin_completed(
    admin_db: Client, user_id: str, properties: dict[str, Any]
) -> dict[str, Any]:
    """Resolve is_first_checkin_at_shop from DB via CheckInService."""
    service = CheckInService(admin_db)
    properties["is_first_checkin_at_shop"] = await service.is_first_checkin_at_shop(
        user_id, properties["shop_id"]
    )
    return properties


def _fire_analytics(
    analytics: AnalyticsProvider,
    event: str,
    properties: dict[str, Any],
    distinct_id: str,
) -> None:
    """Fire-and-forget: send event to PostHog."""
    try:
        # Filter None values — provider interface accepts str | int | bool | None but
        # PostHog silently drops None-valued properties; exclude them for clean data.
        clean_props = {k: v for k, v in properties.items() if v is not None}
        analytics.track(event, clean_props, distinct_id=distinct_id)
    except Exception:
        logger.warning("Analytics track failed", event=event, exc_info=True)


@router.post("/events")
async def track_event(
    body: AnalyticsEventRequest,
    background_tasks: BackgroundTasks,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    admin_db: Client = Depends(get_admin_db),  # noqa: B008
    analytics: AnalyticsProvider = Depends(get_analytics_provider),  # noqa: B008
) -> dict[str, str]:
    user_id = user["id"]
    distinct_id = anonymize_user_id(user_id, salt=settings.anon_salt)
    properties = dict(body.properties)

    if body.event in SPEC_EVENTS:
        if body.event == "checkin_completed":
            properties = await _enrich_checkin_completed(admin_db, user_id, properties)
        # All other spec events: properties already validated and stripped by model
    else:
        properties = sanitize_passthrough(properties)

    background_tasks.add_task(_fire_analytics, analytics, body.event, properties, distinct_id)
    return {"status": "ok"}
