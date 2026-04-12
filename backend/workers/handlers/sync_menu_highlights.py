from typing import Any, cast

import structlog
from supabase import Client

from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_sync_menu_highlights(
    payload: dict[str, Any],
    db: Client,
    queue: JobQueue,
) -> None:
    shop_id = payload["shop_id"]
    logger.info("Syncing menu highlights", shop_id=shop_id)

    response = db.table("shop_menu_items").select("item_name").eq("shop_id", shop_id).execute()
    menu_rows = cast("list[dict[str, Any]]", response.data or [])
    item_names = list({row["item_name"] for row in menu_rows if row.get("item_name")})

    db.table("shops").update({"menu_highlights": item_names}).eq("id", shop_id).execute()
