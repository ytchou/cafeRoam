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


@pytest.mark.asyncio
async def test_persist_enqueues_enrich_shop_when_no_photos(mock_db, mock_queue):
    """When a shop has no photos, ENRICH_SHOP is enqueued directly so it is not stuck in enriching."""
    data = _make_shop_data(photos=[])

    await persist_scraped_data(
        shop_id="shop-02",
        data=data,
        db=mock_db,
        queue=mock_queue,
        submission_id="sub-abc",
        submitted_by="user-xyz",
        batch_id="batch-001",
    )

    enqueue_calls = mock_queue.enqueue.call_args_list
    enrich_calls = [c for c in enqueue_calls if c.kwargs.get("job_type") == JobType.ENRICH_SHOP]
    assert len(enrich_calls) == 1
    payload = enrich_calls[0].kwargs["payload"]
    assert payload["shop_id"] == "shop-02"
    assert payload["submission_id"] == "sub-abc"
    assert payload["submitted_by"] == "user-xyz"
    assert payload["batch_id"] == "batch-001"


@pytest.mark.asyncio
async def test_persist_stores_google_maps_features(mock_db, mock_queue):
    """google_maps_features from ScrapedShopData is persisted to the shops table."""
    features = {"outdoor_seating": True, "wifi_available": True}
    data = _make_shop_data(google_maps_features=features)

    await persist_scraped_data(shop_id="shop-03", data=data, db=mock_db, queue=mock_queue)

    update_calls = mock_db.table.return_value.update.call_args_list
    shop_updates = [
        c for c in update_calls if "google_maps_features" in (c.args[0] if c.args else {})
    ]
    assert len(shop_updates) == 1
    assert shop_updates[0].args[0]["google_maps_features"] == features


@pytest.mark.asyncio
async def test_persist_extracts_city_and_district_from_address(mock_db, mock_queue):
    """When address contains a parseable Taiwan city and district, both are written to the shop payload."""
    data = _make_shop_data(address="106台灣台北市大安區復興南路二段79號")

    await persist_scraped_data(shop_id="shop-04", data=data, db=mock_db, queue=mock_queue)

    update_calls = mock_db.table.return_value.update.call_args_list
    shop_updates = [c for c in update_calls if "city" in (c.args[0] if c.args else {})]
    assert len(shop_updates) == 1
    payload = shop_updates[0].args[0]
    assert payload["city"] == "taipei"
    assert payload["district"] == "大安區"


@pytest.mark.asyncio
async def test_persist_skips_city_and_district_when_address_unparseable(mock_db, mock_queue):
    """When address cannot be parsed for city/district, those fields are omitted from the payload."""
    data = _make_shop_data(address="台北市某咖啡廳")  # no postal code + 台灣 prefix

    await persist_scraped_data(shop_id="shop-05", data=data, db=mock_db, queue=mock_queue)

    update_calls = mock_db.table.return_value.update.call_args_list
    shop_updates = [c for c in update_calls if "processing_status" in (c.args[0] if c.args else {})]
    assert len(shop_updates) == 1
    payload = shop_updates[0].args[0]
    assert "city" not in payload
    assert "district" not in payload


@pytest.mark.asyncio
async def test_persist_writes_threads_url(mock_db, mock_queue):
    """persist_scraped_data writes threads_url to the shops table."""
    data = _make_shop_data(threads_url="https://www.threads.net/@rufous")

    await persist_scraped_data(shop_id="shop-06", data=data, db=mock_db, queue=mock_queue)

    update_calls = mock_db.table.return_value.update.call_args_list
    shop_updates = [
        c for c in update_calls if "threads_url" in (c.args[0] if c.args else {})
    ]
    assert len(shop_updates) == 1
    assert shop_updates[0].args[0]["threads_url"] == "https://www.threads.net/@rufous"
