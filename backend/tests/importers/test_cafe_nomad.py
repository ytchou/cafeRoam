from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from importers.cafe_nomad import fetch_and_import_cafenomad, filter_cafenomad_shops


def test_filter_removes_closed_shops():
    shops: list[dict[str, Any]] = [
        {
            "id": "1",
            "name": "Open Cafe",
            "latitude": "25.033",
            "longitude": "121.565",
            "closed": None,
        },
        {
            "id": "2",
            "name": "Closed Cafe",
            "latitude": "25.034",
            "longitude": "121.566",
            "closed": "1",
        },
    ]
    filtered = filter_cafenomad_shops(shops)
    assert len(filtered) == 1
    assert filtered[0]["name"] == "Open Cafe"


def test_filter_removes_out_of_bounds():
    shops: list[dict[str, Any]] = [
        {
            "id": "1",
            "name": "Taipei Cafe",
            "latitude": "25.033",
            "longitude": "121.565",
            "closed": None,
        },
        {
            "id": "2",
            "name": "Foreign Cafe",
            "latitude": "40.730",
            "longitude": "-73.935",
            "closed": None,
        },
    ]
    filtered = filter_cafenomad_shops(shops)
    assert len(filtered) == 1


_CAFENOMAD_RAW = [
    {
        "id": "cn-1",
        "name": "Good Cafe",
        "address": "1 Test St",
        "latitude": "25.033",
        "longitude": "121.565",
        "closed": None,
        "url": None,
        "mrt": None,
    },
    {
        "id": "cn-2",
        "name": "Bad Cafe",
        "address": "2 Test St",
        "latitude": "25.034",
        "longitude": "121.566",
        "closed": None,
        "url": None,
        "mrt": None,
    },
]


@pytest.mark.asyncio
async def test_cafenomad_continues_on_single_shop_failure():
    """If inserting one shop raises, the import continues and queues the others."""
    db = MagicMock()
    queue = MagicMock()
    queue.enqueue = AsyncMock()

    # Both shops are new (no existing match)
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )

    # First shop insert raises, second succeeds
    first_insert = MagicMock()
    first_insert.execute.side_effect = Exception("DB timeout")
    second_insert = MagicMock()
    second_insert.execute.return_value = MagicMock(data=[{"id": "shop-2"}])
    db.table.return_value.insert.side_effect = [first_insert, second_insert]

    mock_response = MagicMock()
    mock_response.json.return_value = _CAFENOMAD_RAW
    mock_response.raise_for_status = MagicMock()

    with patch("importers.cafe_nomad.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

        count = await fetch_and_import_cafenomad(db=db, queue=queue)

    # Only the second shop should be queued (first failed)
    assert count == 1
    queue.enqueue.assert_called_once()
