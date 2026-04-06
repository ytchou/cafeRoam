from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from providers.scraper.apify_adapter import ApifyScraperAdapter
from providers.scraper.interface import BatchScrapeInput


@pytest.fixture
def adapter():
    return ApifyScraperAdapter(api_token="test-token")


def _place(overrides: dict | None = None) -> dict:
    base = {
        "title": "Fika Fika",
        "address": "台北市松山區伊通街33號",
        "location": {"lat": 25.052, "lng": 121.533},
        "placeId": "ChIJ_fika01",
        "reviews": [],
    }
    return {**base, **(overrides or {})}


# ---------------------------------------------------------------------------
# scrape_batch — happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_scrape_batch_matches_results_by_input_url(adapter):
    """scrape_batch correlates Apify output back to shops via inputStartUrl."""
    shops = [
        BatchScrapeInput(shop_id="shop-1", google_maps_url="https://maps.google.com/?cid=1"),
        BatchScrapeInput(shop_id="shop-2", google_maps_url="https://maps.google.com/?cid=2"),
    ]
    apify_results = [
        _place({"inputStartUrl": "https://maps.google.com/?cid=1", "title": "Coffee A"}),
        _place({"inputStartUrl": "https://maps.google.com/?cid=2", "title": "Coffee B"}),
    ]

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = apify_results
        results = await adapter.scrape_batch(shops)

    assert len(results) == 2
    shop1 = next(r for r in results if r.shop_id == "shop-1")
    shop2 = next(r for r in results if r.shop_id == "shop-2")
    assert shop1.data is not None and shop1.data.name == "Coffee A"
    assert shop2.data is not None and shop2.data.name == "Coffee B"


@pytest.mark.asyncio
async def test_scrape_batch_returns_empty_for_empty_input(adapter):
    """scrape_batch with no shops returns []."""
    results = await adapter.scrape_batch([])
    assert results == []


@pytest.mark.asyncio
async def test_scrape_batch_deduplicates_duplicate_urls(adapter):
    """When two shops share the same URL, the second is dropped and gets None data."""
    shops = [
        BatchScrapeInput(shop_id="shop-A", google_maps_url="https://maps.google.com/?cid=dup"),
        BatchScrapeInput(shop_id="shop-B", google_maps_url="https://maps.google.com/?cid=dup"),
    ]
    apify_results = [
        _place({"inputStartUrl": "https://maps.google.com/?cid=dup", "title": "Dup Cafe"}),
    ]

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = apify_results
        results = await adapter.scrape_batch(shops)

    assert len(results) == 2
    shop_a = next(r for r in results if r.shop_id == "shop-A")
    shop_b = next(r for r in results if r.shop_id == "shop-B")
    assert shop_a.data is not None
    assert shop_b.data is None  # dropped duplicate URL


@pytest.mark.asyncio
async def test_scrape_batch_sets_none_data_for_unmatched_url(adapter):
    """When Apify returns a result with no matching inputStartUrl, data stays None."""
    shops = [
        BatchScrapeInput(shop_id="shop-X", google_maps_url="https://maps.google.com/?cid=X"),
    ]

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [_place({"inputStartUrl": "WRONG"})]
        results = await adapter.scrape_batch(shops)

    assert len(results) == 1
    assert results[0].shop_id == "shop-X"
    assert results[0].data is None


# ---------------------------------------------------------------------------
# _parse_place — field mapping
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parse_place_maps_all_fields(adapter):
    """_parse_place correctly maps a rich Apify place dict."""
    raw = _place(
        {
            "inputStartUrl": "https://maps.google.com/?cid=1",
            "totalScore": 4.5,
            "reviewsCount": 42,
            "phone": "+886-2-1234-5678",
            "website": "https://fikafika.com",
            "menu": "https://fikafika.com/menu",
            "instagrams": ["https://instagram.com/fika"],
            "facebooks": ["https://facebook.com/fika"],
            "countryCode": "TW",
            "price": "$$",
            "permanentlyClosed": False,
            "categoryName": "Coffee shop",
            "openingHours": [{"day": "Monday", "hours": "9:00 AM - 6:00 PM"}],
            "reviews": [{"text": "Great latte", "stars": 5, "publishedAtDate": "2025-12-01"}],
            "imageUrls": ["https://img1.jpg"],
        }
    )

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [raw]
        results = await adapter.scrape_batch(
            [BatchScrapeInput(shop_id="s1", google_maps_url="https://maps.google.com/?cid=1")]
        )

    shop = results[0].data
    assert shop is not None
    assert shop.name == "Fika Fika"
    assert shop.google_place_id == "ChIJ_fika01"
    assert shop.latitude == 25.052
    assert shop.rating == 4.5
    assert shop.instagram_url == "https://instagram.com/fika"
    assert shop.facebook_url == "https://facebook.com/fika"
    assert len(shop.reviews) == 1
    assert shop.opening_hours == [{"day": 0, "open": 540, "close": 1080}]


# ---------------------------------------------------------------------------
# _normalize_opening_hours
# ---------------------------------------------------------------------------


def test_normalize_opening_hours_returns_none_for_none(adapter):
    assert adapter._normalize_opening_hours(None) is None


def test_normalize_opening_hours_returns_none_for_empty_list(adapter):
    assert adapter._normalize_opening_hours([]) is None


def test_normalize_opening_hours_skips_non_dict_entries(adapter):
    """Non-dict entries are filtered; if all stripped, returns None."""
    result = adapter._normalize_opening_hours([{"day": "", "hours": ""}])
    assert result is None or isinstance(result, list)


# ---------------------------------------------------------------------------
# _parse_photos / _parse_images_array
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_photos_parsed_from_images_array_with_timestamps(adapter):
    """When images[] is present, photos carry uploaded_at timestamps."""
    raw = _place(
        {
            "inputStartUrl": "https://maps.google.com/?cid=1",
            "images": [
                {"imageUrl": "https://cdn/a.jpg", "uploadedAt": "2025-06-15T10:30:00.000Z"},
                {"imageUrl": "https://cdn/b.jpg", "uploadedAt": "2024-01-10T08:00:00.000Z"},
            ],
            "imageUrls": ["https://should-not-appear.jpg"],
        }
    )

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [raw]
        results = await adapter.scrape_batch(
            [BatchScrapeInput(shop_id="s1", google_maps_url="https://maps.google.com/?cid=1")]
        )

    photos = results[0].data.photos
    assert len(photos) == 2
    assert photos[0].url == "https://cdn/a.jpg"  # newest first
    assert photos[0].uploaded_at is not None and photos[0].uploaded_at.year == 2025


@pytest.mark.asyncio
async def test_age_filter_drops_photos_older_than_5_years(adapter):
    """Photos with uploadedAt older than 5 years are excluded."""
    now = datetime.now(UTC)
    raw = _place(
        {
            "inputStartUrl": "https://maps.google.com/?cid=1",
            "images": [
                {"imageUrl": "https://cdn/old.jpg", "uploadedAt": (now - timedelta(days=365 * 6)).isoformat()},
                {"imageUrl": "https://cdn/recent.jpg", "uploadedAt": (now - timedelta(days=30)).isoformat()},
            ],
        }
    )

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [raw]
        results = await adapter.scrape_batch(
            [BatchScrapeInput(shop_id="s1", google_maps_url="https://maps.google.com/?cid=1")]
        )

    photos = results[0].data.photos
    assert len(photos) == 1
    assert photos[0].url == "https://cdn/recent.jpg"


@pytest.mark.asyncio
async def test_cap_at_30_photos_sorted_by_recency(adapter):
    """When more than 30 photos exist, only the 30 most recent are kept."""
    now = datetime.now(UTC)
    raw = _place(
        {
            "inputStartUrl": "https://maps.google.com/?cid=1",
            "images": [
                {
                    "imageUrl": f"https://cdn/photo{i}.jpg",
                    "uploadedAt": (now - timedelta(days=i)).isoformat(),
                }
                for i in range(40)
            ],
        }
    )

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [raw]
        results = await adapter.scrape_batch(
            [BatchScrapeInput(shop_id="s1", google_maps_url="https://maps.google.com/?cid=1")]
        )

    photos = results[0].data.photos
    assert len(photos) == 30
    assert "photo0" in photos[0].url  # most recent first


@pytest.mark.asyncio
async def test_fallback_to_image_urls_when_images_absent(adapter):
    """When images[] is absent, fall back to imageUrls with no uploaded_at."""
    raw = _place(
        {
            "inputStartUrl": "https://maps.google.com/?cid=1",
            "imageUrls": ["https://cdn/a.jpg", "https://cdn/b.jpg"],
        }
    )

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [raw]
        results = await adapter.scrape_batch(
            [BatchScrapeInput(shop_id="s1", google_maps_url="https://maps.google.com/?cid=1")]
        )

    photos = results[0].data.photos
    assert len(photos) == 2
    assert photos[0].uploaded_at is None


def test_parse_images_array_skips_invalid_date(adapter):
    """Images with unparseable uploadedAt are included without a timestamp."""
    photos = adapter._parse_images_array([{"imageUrl": "https://cdn/ok.jpg", "uploadedAt": "not-a-date"}])
    assert len(photos) == 1
    assert photos[0].uploaded_at is None


def test_parse_images_array_skips_missing_image_url(adapter):
    """Images without imageUrl are silently skipped."""
    photos = adapter._parse_images_array([
        {"uploadedAt": "2025-01-01T00:00:00.000Z"},
        {"imageUrl": "https://cdn/valid.jpg"},
    ])
    assert len(photos) == 1
    assert photos[0].url == "https://cdn/valid.jpg"


# ---------------------------------------------------------------------------
# _run_actor
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_actor_returns_empty_list_when_actor_call_returns_none(adapter):
    """_run_actor returns [] when the Apify actor call itself returns None."""
    mock_actor = MagicMock()
    mock_actor.call.return_value = None
    adapter._client.actor = MagicMock(return_value=mock_actor)

    result = await adapter._run_actor({"startUrls": []})
    assert result == []
