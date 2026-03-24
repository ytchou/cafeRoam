import asyncio
from typing import Any

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends
from supabase import Client

from api.deps import get_admin_db, get_current_user, get_user_db
from core.anonymize import anonymize_user_id
from core.config import settings
from models.analytics_events import (
    SPEC_EVENTS,
    AnalyticsEventRequest,
    sanitize_passthrough,
)
from providers.analytics import get_analytics_provider
from providers.analytics.interface import AnalyticsProvider
from services.profile_service import ProfileService

logger = structlog.get_logger()
router = APIRouter(prefix="/analytics", tags=["analytics"])


def _enrich_checkin_completed(
    admin_db: Client, user_id: str, properties: dict[str, Any]
) -> dict[str, Any]:
    """Resolve is_first_checkin_at_shop from DB."""
    shop_id = properties["shop_id"]
    result = (
        admin_db.table("check_ins")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("shop_id", shop_id)
        .execute()
    )
    # count includes the just-created check-in, so first = count <= 1
    properties["is_first_checkin_at_shop"] = (result.count or 0) <= 1
    return properties


async def _enrich_session_start(
    db: Client, user_id: str, properties: dict[str, Any]
) -> dict[str, Any]:
    """Call session_heartbeat to get session analytics data."""
    service = ProfileService(db=db)
    heartbeat = await service.session_heartbeat(user_id)
    properties["days_since_first_session"] = heartbeat["days_since_first_session"]
    properties["previous_sessions"] = heartbeat["previous_sessions"]
    return properties


def _fire_analytics(
    analytics: AnalyticsProvider,
    event: str,
    properties: dict[str, Any],
    distinct_id: str,
) -> None:
    """Fire-and-forget: send event to PostHog."""
    try:
        analytics.track(event, properties, distinct_id=distinct_id)
    except Exception:
        logger.warning("Analytics track failed", event=event, exc_info=True)


@router.post("/events")
async def track_event(
    body: AnalyticsEventRequest,
    background_tasks: BackgroundTasks,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
    admin_db: Client = Depends(get_admin_db),  # noqa: B008
    analytics: AnalyticsProvider = Depends(get_analytics_provider),  # noqa: B008
) -> dict[str, str]:
    user_id = user["id"]
    distinct_id = anonymize_user_id(user_id, salt=settings.anon_salt)
    properties = dict(body.properties)

    if body.event in SPEC_EVENTS:
        # Server-side enrichment for events that need it
        if body.event == "checkin_completed":
            properties = await asyncio.to_thread(
                _enrich_checkin_completed, admin_db, user_id, properties
            )
        elif body.event == "session_start":
            properties = await _enrich_session_start(db, user_id, properties)
    else:
        # Passthrough: PDPA filter + source tag
        properties = sanitize_passthrough(properties)

    background_tasks.add_task(_fire_analytics, analytics, body.event, properties, distinct_id)
    return {"status": "ok"}
