import re
from typing import Any

import structlog
from supabase import Client

from models.types import PhotoCategory
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = structlog.get_logger()

_SIZE_SUFFIX_RE = re.compile(r"=[wsh]\d+[^/]*$")
_MENU_CAP = 5
_VIBE_CAP = 10


def to_thumbnail_url(url: str, width: int = 400, height: int = 225) -> str:
    """Rewrite Google Maps CDN URL to thumbnail size for cheaper Vision calls."""
    if _SIZE_SUFFIX_RE.search(url):
        return _SIZE_SUFFIX_RE.sub(f"=w{width}-h{height}-k-no", url)
    return url


async def handle_classify_shop_photos(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
) -> None:
    """Classify unclassified shop photos as MENU/VIBE/SKIP via Claude Haiku Vision."""
    shop_id = payload["shop_id"]

    # Fetch unclassified photos
    response = (
        db.table("shop_photos")
        .select("id, url, uploaded_at")
        .eq("shop_id", shop_id)
        .is_("category", "null")
        .execute()
    )
    photos = response.data
    if not photos:
        logger.info("No unclassified photos", shop_id=shop_id)
        return

    logger.info("Classifying photos", shop_id=shop_id, count=len(photos))

    # Classify each photo individually (for fault isolation)
    classified: list[dict[str, Any]] = []
    for photo in photos:
        thumbnail = to_thumbnail_url(photo["url"])
        try:
            category = await llm.classify_photo(thumbnail)
        except Exception:
            logger.warning("Photo classification failed, skipping", photo_id=photo["id"])
            continue

        db.table("shop_photos").update(
            {"category": category.value, "is_menu": category == PhotoCategory.MENU}
        ).eq("id", photo["id"]).execute()

        classified.append({"id": photo["id"], "category": category, "uploaded_at": photo.get("uploaded_at")})

    # Enforce caps: keep newest N per category, downgrade extras to SKIP
    _enforce_cap(db, classified, PhotoCategory.MENU, _MENU_CAP)
    _enforce_cap(db, classified, PhotoCategory.VIBE, _VIBE_CAP)

    logger.info(
        "Photo classification complete",
        shop_id=shop_id,
        total=len(classified),
        menu=sum(1 for c in classified if c["category"] == PhotoCategory.MENU),
        vibe=sum(1 for c in classified if c["category"] == PhotoCategory.VIBE),
    )


def _enforce_cap(
    db: Client,
    classified: list[dict[str, Any]],
    category: PhotoCategory,
    cap: int,
) -> None:
    """Downgrade excess photos of a category to SKIP, keeping newest by uploaded_at."""
    matching = [c for c in classified if c["category"] == category]
    if len(matching) <= cap:
        return

    # Sort by uploaded_at descending (None last)
    matching.sort(
        key=lambda c: c.get("uploaded_at") or "",
        reverse=True,
    )
    excess = matching[cap:]
    for item in excess:
        db.table("shop_photos").update(
            {"category": PhotoCategory.SKIP.value, "is_menu": False}
        ).eq("id", item["id"]).execute()
        item["category"] = PhotoCategory.SKIP
