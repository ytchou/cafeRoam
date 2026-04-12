"""Tests for the sync_menu_highlights worker handler."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from workers.handlers.sync_menu_highlights import handle_sync_menu_highlights


def _make_db(menu_rows: list[dict[str, str | None]]) -> MagicMock:
    db = MagicMock()

    shops_table = MagicMock()
    shops_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    menu_table = MagicMock()
    menu_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=menu_rows)

    def table_router(name: str) -> MagicMock:
        if name == "shops":
            return shops_table
        if name == "shop_menu_items":
            return menu_table
        return MagicMock()

    db.table.side_effect = table_router
    db._shops_table = shops_table
    return db


@pytest.mark.asyncio
async def test_sync_menu_highlights_writes_distinct_item_names():
    db = _make_db([{"item_name": "拿鐵"}, {"item_name": "可頌"}])
    queue = AsyncMock()

    await handle_sync_menu_highlights(
        payload={"shop_id": "shop-1"},
        db=db,
        queue=queue,
    )

    update_data = db._shops_table.update.call_args[0][0]
    assert set(update_data["menu_highlights"]) == {"拿鐵", "可頌"}


@pytest.mark.asyncio
async def test_sync_menu_highlights_writes_empty_list_when_no_rows():
    db = _make_db([])
    queue = AsyncMock()

    await handle_sync_menu_highlights(
        payload={"shop_id": "shop-1"},
        db=db,
        queue=queue,
    )

    update_data = db._shops_table.update.call_args[0][0]
    assert update_data["menu_highlights"] == []


@pytest.mark.asyncio
async def test_sync_menu_highlights_deduplicates_item_names():
    db = _make_db([{"item_name": "拿鐵"}, {"item_name": "拿鐵"}, {"item_name": "美式"}])
    queue = AsyncMock()

    await handle_sync_menu_highlights(
        payload={"shop_id": "shop-1"},
        db=db,
        queue=queue,
    )

    update_data = db._shops_table.update.call_args[0][0]
    assert set(update_data["menu_highlights"]) == {"拿鐵", "美式"}


@pytest.mark.asyncio
async def test_sync_menu_highlights_filters_missing_item_names():
    db = _make_db([{"item_name": "拿鐵"}, {"item_name": None}, {"item_name": ""}])
    queue = AsyncMock()

    await handle_sync_menu_highlights(
        payload={"shop_id": "shop-1"},
        db=db,
        queue=queue,
    )

    update_data = db._shops_table.update.call_args[0][0]
    assert update_data["menu_highlights"] == ["拿鐵"]
