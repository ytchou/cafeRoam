import structlog

from providers.llm.interface import LLMProvider

logger = structlog.get_logger()


async def handle_enrich_menu_photo(
    payload: dict,
    db,
    llm: LLMProvider,
) -> None:
    """Extract menu data from a check-in photo."""
    shop_id = payload["shop_id"]
    image_url = payload["image_url"]
    logger.info("Extracting menu data", shop_id=shop_id)

    result = await llm.extract_menu_data(image_url=image_url)

    # Merge menu data into shop record
    if result.items:
        db.table("shops").update({
            "menu_data": result.items,
        }).eq("id", shop_id).execute()

    logger.info("Menu data extracted", shop_id=shop_id, item_count=len(result.items))
