from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from models.types import JobType
from providers.scraper.interface import ScrapedPhotoData, ScrapedShopData
from workers.persist import persist_scraped_data


def _make_shop_data(**overrides) -> ScrapedShopData:
    defaults = {
        "name": "Rufous Coffee",
        "address": "台北市大安區復興南路二段79號",
        "latitude": 25.033,
        "longitude": 121.544,
        "google_place_id": "ChIJ_rufous",
        "country_code": "TW",
    }
    defaults.update(overrides)
    return ScrapedShopData(**defaults)


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    return db


@pytest.fixture
def mock_queue():
    return AsyncMock()


@pytest.mark.asyncio
async def test_persist_photos_includes_uploaded_at(mock_db, mock_queue):
    """When photos have uploaded_at, the upsert includes the timestamp."""
    ts = datetime(2025, 6, 15, 10, 0, tzinfo=UTC)
    data = _make_shop_data(photos=[ScrapedPhotoData(url="https://cdn/photo1.jpg", uploaded_at=ts)])

    await persist_scraped_data(shop_id="shop-01", data=data, db=mock_db, queue=mock_queue)

    upsert_call = mock_db.table.return_value.upsert
    upsert_call.assert_called_once()
    rows = upsert_call.call_args[0][0]
    assert rows[0]["uploaded_at"] == ts.isoformat()


@pytest.mark.asyncio
async def test_persist_enqueues_classify_job_when_photos_present(mock_db, mock_queue):
    """After persisting photos, a classify_shop_photos job is enqueued."""
    data = _make_shop_data(photos=[ScrapedPhotoData(url="https://cdn/p1.jpg")])

    await persist_scraped_data(shop_id="shop-01", data=data, db=mock_db, queue=mock_queue)

    enqueue_calls = mock_queue.enqueue.call_args_list
    classify_calls = [
        c for c in enqueue_calls if c.kwargs.get("job_type") == JobType.CLASSIFY_SHOP_PHOTOS
    ]
    assert len(classify_calls) == 1
    assert classify_calls[0].kwargs["payload"]["shop_id"] == "shop-01"


@pytest.mark.asyncio
async def test_persist_skips_classify_when_no_photos(mock_db, mock_queue):
    """When there are no photos, no classification job is enqueued."""
    data = _make_shop_data(photos=[])

    await persist_scraped_data(shop_id="shop-01", data=data, db=mock_db, queue=mock_queue)

    enqueue_calls = mock_queue.enqueue.call_args_list
    classify_calls = [
        c for c in enqueue_calls if c.kwargs.get("job_type") == JobType.CLASSIFY_SHOP_PHOTOS
    ]
    assert len(classify_calls) == 0
