from datetime import UTC, datetime
from typing import Any, cast

import structlog
from postgrest.exceptions import APIError
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

    status_set = False
    try:
        # Check shop source to decide whether to auto-publish or hold for review
        try:
            shop_response = (
                db.table("shops").select("name, source").eq("id", shop_id).single().execute()
            )
        except APIError as e:
            logger.error(
                "publish_shop: shop row not found — may have been deleted before worker ran",
                shop_id=shop_id,
                error=str(e),
            )
            return
        shop_data = cast("dict[str, Any]", shop_response.data)
        shop_name = shop_data.get("name", "Unknown")
        source = shop_data.get("source")
        if source == "user_submission":
            # User submissions require admin review before going live
            db.table("shops").update({"processing_status": "pending_review", "updated_at": now}).eq(
                "id", shop_id
            ).execute()
            status_set = True

            if submission_id:
                try:
                    db.table("shop_submissions").update(
                        {"status": "pending_review", "updated_at": now}
                    ).eq("id", submission_id).execute()
                except Exception:
                    logger.warning(
                        "publish_shop: submission update failed — shop is pending_review",
                        shop_id=shop_id,
                        submission_id=submission_id,
                        exc_info=True,
                    )

            logger.info(
                "Shop routed to pending_review",
                shop_id=shop_id,
                shop_name=shop_name,
            )
        else:
            # Non-user sources (cafe_nomad, manual, etc.) go live immediately
            db.table("shops").update({"processing_status": "live", "updated_at": now}).eq(
                "id", shop_id
            ).execute()
            status_set = True

            # Insert activity feed event only for user-submitted shops
            if submitted_by:
                try:
                    db.table("activity_feed").insert(
                        {
                            "event_type": "shop_added",
                            "actor_id": submitted_by,
                            "shop_id": shop_id,
                            "metadata": {"shop_name": shop_name},
                        }
                    ).execute()
                except Exception:
                    logger.warning(
                        "publish_shop: activity_feed insert failed — shop is live",
                        shop_id=shop_id,
                        exc_info=True,
                    )

            # Update submission if exists
            if submission_id:
                try:
                    db.table("shop_submissions").update({"status": "live", "updated_at": now}).eq(
                        "id", submission_id
                    ).execute()
                except Exception:
                    logger.warning(
                        "publish_shop: submission update failed — shop is live",
                        shop_id=shop_id,
                        submission_id=submission_id,
                        exc_info=True,
                    )

            logger.info("Shop published", shop_id=shop_id, shop_name=shop_name)

    except Exception as exc:
        if not status_set:
            db.table("shops").update(
                {
                    "processing_status": "failed",
                    "rejection_reason": f"Publish error: {exc}",
                    "updated_at": now,
                }
            ).eq("id", shop_id).execute()
        raise
