from datetime import UTC, datetime
from typing import Any

import structlog
from supabase import Client

from models.types import JobType
from providers.llm.interface import LLMProvider
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_enrich_menu_photo(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
) -> None:
    """Extract menu items from menu photos, persist with source attribution, trigger re-embed."""
    shop_id = payload["shop_id"]

    # Support both new multi-photo and legacy single-photo payloads
    photos = payload.get("photos")
    if not photos:
        image_url = payload.get("image_url")
        if not image_url:
            logger.warning(
                "enrich_menu_photo: no photos or image_url in payload",
                shop_id=shop_id,
            )
            return
        photos = [{"photo_id": None, "image_url": image_url}]

    # Accumulate all rows and photo-id deletes across photos before writing
    all_rows: list[dict[str, Any]] = []
    photo_ids_to_delete: list[str] = []
    all_new_names: list[str] = []

    for photo in photos:
        photo_id = photo.get("photo_id")
        image_url = photo["image_url"]

        try:
            result = await llm.extract_menu_data(image_url=image_url)
        except Exception:
            logger.exception(
                "LLM extraction failed",
                shop_id=shop_id,
                photo_id=photo_id,
            )
            continue

        if not result.items:
            logger.info(
                "No items extracted",
                shop_id=shop_id,
                photo_id=photo_id,
            )
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

        if photo_id:
            photo_ids_to_delete.append(photo_id)

        all_new_names.extend(row["item_name"] for row in rows)
        all_rows.extend(rows)

    if not all_rows:
        return

    # Batch delete: existing items for each processed photo
    if photo_ids_to_delete:
        db.table("shop_menu_items").delete().in_("source_photo_id", photo_ids_to_delete).execute()

    # Batch delete: photo-wins over review-sourced items with colliding names
    if all_new_names:
        db.table("shop_menu_items").delete().eq("shop_id", shop_id).eq("source", "review").in_(
            "item_name", all_new_names
        ).execute()

    # Batch insert all rows
    db.table("shop_menu_items").insert(all_rows).execute()

    logger.info(
        "Menu items written",
        shop_id=shop_id,
        count=len(all_rows),
        photos=len(photo_ids_to_delete),
    )

    await queue.enqueue(
        job_type=JobType.GENERATE_EMBEDDING,
        payload={"shop_id": shop_id},
        priority=5,
    )
    await queue.enqueue(
        job_type=JobType.SYNC_MENU_HIGHLIGHTS,
        payload={"shop_id": shop_id},
        priority=5,
    )
