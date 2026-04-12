import logging
from datetime import UTC, datetime
from typing import Any

from supabase import Client

from models.types import JobType
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = logging.getLogger(__name__)


async def handle_enrich_menu_photo(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
) -> None:
    """Extract menu items from menu photos, persist with source attribution, trigger re-embedding."""
    shop_id = payload["shop_id"]

    # Support both new multi-photo and legacy single-photo payloads
    photos = payload.get("photos")
    if not photos:
        image_url = payload.get("image_url")
        if not image_url:
            logger.warning("enrich_menu_photo: no photos or image_url in payload for shop %s", shop_id)
            return
        photos = [{"photo_id": None, "image_url": image_url}]

    any_items_written = False

    for photo in photos:
        photo_id = photo.get("photo_id")
        image_url = photo["image_url"]

        try:
            result = await llm.extract_menu_data(image_url=image_url)
        except Exception:
            logger.exception("enrich_menu_photo: LLM failed for photo %s (shop %s)", photo_id, shop_id)
            continue

        if not result.items:
            logger.info("enrich_menu_photo: no items extracted from photo %s (shop %s)", photo_id, shop_id)
            continue

        rows = [
            {
                "shop_id": shop_id,
                "item_name": item["name"],
                "price": item.get("price"),
                "category": item.get("category"),
                "source": "photo",
                "source_photo_id": photo_id,
                "extracted_at": datetime.now(UTC).isoformat(),
            }
            for item in result.items
            if item.get("name")
        ]

        if not rows:
            continue

        # Delete existing items from this specific photo
        if photo_id:
            db.table("shop_menu_items").delete().eq("source_photo_id", photo_id).execute()

        # Photo-wins: delete review-sourced items with colliding names
        new_names = [row["item_name"] for row in rows]
        db.table("shop_menu_items").delete().eq("shop_id", shop_id).eq("source", "review").in_("item_name", new_names).execute()

        db.table("shop_menu_items").insert(rows).execute()
        any_items_written = True
        logger.info("enrich_menu_photo: wrote %d items from photo %s (shop %s)", len(rows), photo_id, shop_id)

    if any_items_written:
        await queue.enqueue(
            job_type=JobType.GENERATE_EMBEDDING,
            payload={"shop_id": shop_id},
            priority=5,
        )
