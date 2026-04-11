import contextlib
import re
import time
from typing import Any, cast

import structlog
from supabase import Client

from core.db import first
from models.types import JobType, PhotoCategory
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = structlog.get_logger()

_SIZE_SUFFIX_RE = re.compile(r"=[wsh]\d+[^/]*(?=/|$)")
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
    job_id: str | None = None,
) -> None:
    """Classify unclassified shop photos as MENU/VIBE/SKIP via Claude Haiku Vision."""
    step_timings: dict[str, dict[str, int]] = {}
    shop_id = payload["shop_id"]

    try:
        t0 = time.monotonic()
        # Fetch unclassified photos
        response = (
            db.table("shop_photos")
            .select("id, url, uploaded_at")
            .eq("shop_id", shop_id)
            .is_("category", "null")
            .execute()
        )
        photos: list[dict[str, Any]] = response.data  # type: ignore[assignment]
        if not photos:
            logger.info("No unclassified photos, enqueueing enrichment directly", shop_id=shop_id)

        # Query already-classified counts to enforce global caps across runs
        existing_counts = _get_existing_category_counts(db, shop_id)
        step_timings["fetch_photos"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        t0 = time.monotonic()
        logger.info("Classifying photos", shop_id=shop_id, count=len(photos))

        # Classify each photo individually (for fault isolation); accumulate in memory
        classified: list[dict[str, Any]] = []
        for photo in photos:
            thumbnail = to_thumbnail_url(photo["url"])
            try:
                category = await llm.classify_photo(thumbnail)
            except Exception:
                logger.warning(
                    "Photo classification failed, skipping",
                    photo_id=photo["id"],
                    exc_info=True,
                )
                continue

            classified.append(
                {"id": photo["id"], "category": category, "uploaded_at": photo.get("uploaded_at")}
            )

        # Enforce caps against global totals; mutates item["category"] for excess rows
        menu_slots = max(0, _MENU_CAP - existing_counts.get(PhotoCategory.MENU, 0))
        vibe_slots = max(0, _VIBE_CAP - existing_counts.get(PhotoCategory.VIBE, 0))
        _enforce_cap(classified, PhotoCategory.MENU, menu_slots)
        _enforce_cap(classified, PhotoCategory.VIBE, vibe_slots)
        step_timings["classify"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        # Batch write: one update call per final category
        t0 = time.monotonic()
        _batch_write(db, classified)
        step_timings["db_write"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        logger.info(
            "Photo classification complete",
            shop_id=shop_id,
            total=len(classified),
            menu=sum(1 for c in classified if c["category"] == PhotoCategory.MENU),
            vibe=sum(1 for c in classified if c["category"] == PhotoCategory.VIBE),
        )

        # Trigger enrichment now that photos are classified and VIBE photos are available.
        # Carry submission context forward so enrich->embed->publish can update submission
        # status and create activity records correctly.
        enrich_payload: dict[str, object] = {"shop_id": shop_id}
        submission_response = (
            db.table("shop_submissions")
            .select("id, submitted_by")
            .eq("shop_id", shop_id)
            .eq("status", "processing")
            .limit(1)
            .execute()
        )
        if submission_response.data:
            sub = cast(
                "dict[str, Any]",
                first(submission_response.data, "shop_submissions for classify->enrich"),
            )
            enrich_payload["submission_id"] = sub["id"]
            enrich_payload["submitted_by"] = sub["submitted_by"]

        await queue.enqueue(
            job_type=JobType.ENRICH_SHOP,
            payload=enrich_payload,
            priority=5,
        )
    finally:
        if job_id is not None:
            with contextlib.suppress(Exception):
                (
                    db.table("job_queue")
                    .update({"step_timings": step_timings})
                    .eq("id", str(job_id))
                    .execute()
                )


def _get_existing_category_counts(db: Client, shop_id: str) -> dict[PhotoCategory, int]:
    """Query already-classified (non-null, non-SKIP) photo counts per category for a shop."""
    response = (
        db.table("shop_photos")
        .select("category")
        .eq("shop_id", shop_id)
        .not_.is_("category", "null")
        .neq("category", PhotoCategory.SKIP.value)
        .execute()
    )
    counts: dict[PhotoCategory, int] = {}
    rows: list[dict[str, Any]] = response.data  # type: ignore[assignment]
    for row in rows:
        try:
            cat = PhotoCategory(row["category"])
        except ValueError:
            continue
        counts[cat] = counts.get(cat, 0) + 1
    return counts


def _enforce_cap(
    classified: list[dict[str, Any]],
    category: PhotoCategory,
    remaining_slots: int,
) -> None:
    """Downgrade excess photos of a category to SKIP, keeping newest by uploaded_at."""
    matching = [c for c in classified if c["category"] == category]
    if len(matching) <= remaining_slots:
        return

    matching.sort(
        key=lambda c: c.get("uploaded_at") or "",
        reverse=True,
    )
    for item in matching[remaining_slots:]:
        item["category"] = PhotoCategory.SKIP


def _batch_write(db: Client, classified: list[dict[str, Any]]) -> None:
    """Write all classified results to DB in one update call per category."""
    ids_by_category: dict[PhotoCategory, list[str]] = {}
    for item in classified:
        ids_by_category.setdefault(item["category"], []).append(item["id"])

    for category, ids in ids_by_category.items():
        db.table("shop_photos").update(
            {"category": category.value, "is_menu": category == PhotoCategory.MENU}
        ).in_("id", ids).execute()
