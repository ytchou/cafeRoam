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
    """Extract menu data from a check-in photo, persist items, and trigger re-embedding."""
    shop_id = payload["shop_id"]
    image_url = payload["image_url"]
    logger.info("Extracting menu data", shop_id=shop_id)

    result = await llm.extract_menu_data(image_url=image_url)

    if not result.items:
        logger.info("No menu items extracted — preserving existing", shop_id=shop_id)
        return

    # Replace-on-extract: delete existing items, then insert new batch
    db.table("shop_menu_items").delete().eq("shop_id", shop_id).execute()

    rows = [
        {
            "shop_id": shop_id,
            "item_name": item.get("name", ""),
            "price": item.get("price"),
            "category": item.get("category"),
            "extracted_at": datetime.now(UTC).isoformat(),
        }
        for item in result.items
        if item.get("name")
    ]
    if rows:
        db.table("shop_menu_items").insert(rows).execute()

    # Dual-write to shops.menu_data (temporary — kept until follow-up cleanup ticket)
    db.table("shops").update({"menu_data": result.items}).eq("id", shop_id).execute()

    # Trigger re-embedding so menu items appear in search
    await queue.enqueue(
        job_type=JobType.GENERATE_EMBEDDING,
        payload={"shop_id": shop_id},
        priority=5,
    )

    logger.info("Menu data extracted", shop_id=shop_id, item_count=len(rows))
