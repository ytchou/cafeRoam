from unittest.mock import AsyncMock, MagicMock

import pytest

from importers.google_takeout import import_takeout_to_queue, parse_takeout_places

_GEOJSON_TAIPEI = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"coordinates": [121.565, 25.033]},
            "properties": {
                "Title": "Taipei Cafe",
                "Google Maps URL": "https://maps.google.com/?cid=123",
                "Location": {"Address": "123 Taipei St"},
            },
        },
    ],
}


def test_parse_takeout_filters_to_taiwan():
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"coordinates": [121.565, 25.033]},
                "properties": {
                    "Title": "Taipei Cafe",
                    "Google Maps URL": "https://maps.google.com/?cid=123",
                    "Location": {"Address": "123 Taipei St"},
                },
            },
            {
                "type": "Feature",
                "geometry": {"coordinates": [-73.935, 40.730]},
                "properties": {
                    "Title": "NYC Coffee",
                    "Google Maps URL": "https://maps.google.com/?cid=456",
                    "Location": {"Address": "NYC"},
                },
            },
        ],
    }

    results = parse_takeout_places(geojson)
    assert len(results) == 1
    assert results[0]["name"] == "Taipei Cafe"


def test_parse_takeout_extracts_google_maps_url():
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"coordinates": [121.5, 25.0]},
                "properties": {
                    "Title": "Test",
                    "Google Maps URL": "https://maps.google.com/?cid=789",
                    "Location": {"Address": "Test St"},
                },
            },
        ],
    }

    results = parse_takeout_places(geojson)
    assert results[0]["google_maps_url"] == "https://maps.google.com/?cid=789"


@pytest.fixture
def mock_db_no_existing():
    """DB with no matching shops — dedup check returns empty."""
    db = MagicMock()
    # Dedup query: table("shops").select("id").ilike(...).gte(...).lte(...).gte(...).lte(...).execute()
    db.table.return_value.select.return_value.ilike.return_value.gte.return_value.lte.return_value.gte.return_value.lte.return_value.execute.return_value = MagicMock(
        data=[]
    )
    # Insert returns a shop id
    db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "new-shop-1"}]
    )
    return db


@pytest.fixture
def mock_db_existing():
    """DB with an existing matching shop — dedup check returns one row."""
    db = MagicMock()
    db.table.return_value.select.return_value.ilike.return_value.gte.return_value.lte.return_value.gte.return_value.lte.return_value.execute.return_value = MagicMock(
        data=[{"id": "existing-shop-1"}]
    )
    return db


@pytest.fixture
def mock_queue():
    queue = MagicMock()
    queue.enqueue = AsyncMock(return_value="job-1")
    return queue


@pytest.mark.asyncio
async def test_import_takeout_inserts_new_shop(mock_db_no_existing, mock_queue):
    count = await import_takeout_to_queue(_GEOJSON_TAIPEI, mock_db_no_existing, mock_queue)
    assert count == 1
    mock_queue.enqueue.assert_called_once()


@pytest.mark.asyncio
async def test_import_takeout_skips_duplicate(mock_db_existing, mock_queue):
    count = await import_takeout_to_queue(_GEOJSON_TAIPEI, mock_db_existing, mock_queue)
    assert count == 0
    mock_queue.enqueue.assert_not_called()
