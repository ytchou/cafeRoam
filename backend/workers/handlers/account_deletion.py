from datetime import UTC, datetime, timedelta

import structlog

from db.supabase_client import get_service_role_client

logger = structlog.get_logger()

GRACE_PERIOD_DAYS = 30


async def delete_expired_accounts() -> None:
    """Delete accounts where deletion was requested more than 30 days ago.

    For each expired account:
    1. Delete Storage objects (check-in photos)
    2. Call auth.admin.delete_user() -- DB CASCADE handles profiles, lists, check-ins, stamps
    """
    db = get_service_role_client()
    cutoff = (datetime.now(UTC) - timedelta(days=GRACE_PERIOD_DAYS)).isoformat()

    result = (
        db.table("profiles")
        .select("id, deletion_requested_at")
        .lt("deletion_requested_at", cutoff)
        .execute()
    )

    if not result.data:
        return

    logger.info("Found expired accounts to delete", count=len(result.data))

    for profile in result.data:
        user_id = profile["id"]
        try:
            _delete_user_storage(db, user_id)
            db.auth.admin.delete_user(user_id)
            logger.info("Deleted expired account", user_id=user_id)
        except Exception:
            logger.exception("Failed to delete expired account", user_id=user_id)


def _delete_user_storage(db, user_id: str) -> None:  # type: ignore[no-untyped-def]
    """Delete all Storage objects belonging to a user in the checkin-photos bucket."""
    bucket = db.storage.from_("checkin-photos")
    try:
        files = bucket.list(path=user_id)
        if files:
            file_paths = [f"{user_id}/{f['name']}" for f in files]
            bucket.remove(file_paths)
            logger.info("Deleted storage files", user_id=user_id, count=len(file_paths))
    except Exception:
        logger.exception("Failed to clean up storage", user_id=user_id)
