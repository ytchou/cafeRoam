from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

import structlog

from db.supabase_client import get_service_role_client

logger = structlog.get_logger()

GRACE_PERIOD_DAYS = 30


async def delete_expired_accounts() -> None:
    """Delete accounts where deletion was requested more than 30 days ago.

    For each expired account:
    1. Delete Storage objects (check-in photos, menu photos)
    2. Call auth.admin.delete_user() -- DB CASCADE handles profiles, lists, check-ins, stamps

    Storage deletion is NOT wrapped in a try/except so that failures prevent the
    hard-delete from running. The account stays intact for retry on the next run.
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
        uid_prefix = user_id[:8]
        try:
            _delete_user_storage(db, user_id)
            db.auth.admin.delete_user(user_id)
            logger.info("Deleted expired account", user_id=uid_prefix)
        except Exception:
            logger.exception("Failed to delete expired account", user_id=uid_prefix)


def _delete_user_storage(db, user_id: str) -> None:  # type: ignore[no-untyped-def]
    """Delete all Storage objects belonging to a user.

    Raises on failure so the caller does NOT proceed with hard-deleting the auth
    user — keeping files and DB rows consistent for retry on the next scheduler run.
    """
    uid_prefix = user_id[:8]

    # 1. Delete check-in photos (organised by user_id folder prefix in checkin-photos bucket)
    # Use a high limit to avoid the default 100-item page cap (PDPA requires complete deletion)
    checkin_bucket = db.storage.from_("checkin-photos")
    files = checkin_bucket.list(path=user_id, options={"limit": 10000})
    if files:
        file_paths = [f"{user_id}/{f['name']}" for f in files]
        checkin_bucket.remove(file_paths)
        logger.info("Deleted check-in photos", user_id=uid_prefix, count=len(file_paths))

    # 2. Delete menu photos (stored as full Supabase Storage URLs in check_ins.menu_photo_url)
    checkins = (
        db.table("check_ins")
        .select("menu_photo_url")
        .eq("user_id", user_id)
        .not_.is_("menu_photo_url", "null")
        .execute()
    )
    if checkins.data:
        menu_urls = [row["menu_photo_url"] for row in checkins.data]
        _delete_storage_objects_by_url(db, menu_urls)
        logger.info("Deleted menu photos", user_id=uid_prefix, count=len(menu_urls))


def _delete_storage_objects_by_url(db, urls: list[str]) -> None:  # type: ignore[no-untyped-def]
    """Delete storage objects by their Supabase public URLs.

    Parses each URL to extract bucket name and object path, then groups by bucket
    for bulk deletion. URL format:
    https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    """
    by_bucket: dict[str, list[str]] = {}
    for url in urls:
        parsed = urlparse(url)
        parts = parsed.path.split("/storage/v1/object/public/", 1)
        if len(parts) < 2:
            # Log only scheme+host to avoid exposing user_id embedded in the URL path
            safe_origin = f"{parsed.scheme}://{parsed.netloc}/..."
            logger.error("Unrecognized storage URL format — aborting PDPA deletion", url=safe_origin)
            raise RuntimeError(f"Unrecognized storage URL format: {safe_origin}")
        bucket_name, _, obj_path = parts[1].partition("/")
        if not bucket_name or not obj_path:
            safe_origin = f"{parsed.scheme}://{parsed.netloc}/..."
            logger.error("Could not extract bucket/path from storage URL — aborting PDPA deletion", url=safe_origin)
            raise RuntimeError(f"Could not extract bucket/path from storage URL: {safe_origin}")
        by_bucket.setdefault(bucket_name, []).append(obj_path)

    for bucket_name, paths in by_bucket.items():
        db.storage.from_(bucket_name).remove(paths)
