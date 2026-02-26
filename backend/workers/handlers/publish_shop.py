from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

logger = structlog.get_logger()


async def handle_publish_shop(
    payload: dict[str, Any],
    db: Client,
) -> None:
    """Publish a shop — set it live, emit activity feed event, flag for admin review."""
    shop_id = payload["shop_id"]
    submission_id = payload.get("submission_id")
    submitted_by = payload.get("submitted_by")

    logger.info("Publishing shop", shop_id=shop_id)

    now = datetime.now(UTC).isoformat()

    # Set shop as live
    db.table("shops").update({"processing_status": "live", "updated_at": now}).eq(
        "id", shop_id
    ).execute()

    # Get shop name for activity feed
    shop_response = db.table("shops").select("name").eq("id", shop_id).single().execute()
    shop_name = cast("dict[str, Any]", shop_response.data).get("name", "Unknown")

    # Insert activity feed event only for user-submitted shops
    if submitted_by:
        db.table("activity_feed").insert(
            {
                "event_type": "shop_added",
                "actor_id": submitted_by,
                "shop_id": shop_id,
                "metadata": {"shop_name": shop_name},
            }
        ).execute()

    # Update submission if exists
    if submission_id:
        db.table("shop_submissions").update({"status": "live", "updated_at": now}).eq(
            "id", submission_id
        ).execute()

    logger.info("Shop published", shop_id=shop_id, shop_name=shop_name)
