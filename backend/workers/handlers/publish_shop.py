from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

logger = structlog.get_logger()


async def handle_publish_shop(
    payload: dict[str, Any],
    db: Client,
) -> None:
    """Publish a shop — set it live, or route to pending_review for user submissions."""
    shop_id = payload["shop_id"]
    submission_id = payload.get("submission_id")
    submitted_by = payload.get("submitted_by")

    logger.info("Publishing shop", shop_id=shop_id)

    now = datetime.now(UTC).isoformat()

    # Check shop source to decide whether to auto-publish or hold for review
    shop_response = (
        db.table("shops")
        .select("name, source")
        .eq("id", shop_id)
        .single()
        .execute()
    )
    shop_data = cast("dict[str, Any]", shop_response.data)
    shop_name = shop_data.get("name", "Unknown")
    source = shop_data.get("source")

    if source == "user_submission":
        # User submissions require admin review before going live
        db.table("shops").update(
            {"processing_status": "pending_review", "updated_at": now}
        ).eq("id", shop_id).execute()

        if submission_id:
            db.table("shop_submissions").update(
                {"status": "pending_review", "updated_at": now}
            ).eq("id", submission_id).execute()

        logger.info(
            "Shop routed to pending_review",
            shop_id=shop_id,
            shop_name=shop_name,
        )
    else:
        # Non-user sources (cafe_nomad, manual, etc.) go live immediately
        db.table("shops").update(
            {"processing_status": "live", "updated_at": now}
        ).eq("id", shop_id).execute()

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
            db.table("shop_submissions").update(
                {"status": "live", "updated_at": now}
            ).eq("id", submission_id).execute()

        logger.info("Shop published", shop_id=shop_id, shop_name=shop_name)
