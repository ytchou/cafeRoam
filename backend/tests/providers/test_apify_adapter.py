from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from providers.scraper.apify_adapter import ApifyScraperAdapter


@pytest.fixture
def adapter():
    return ApifyScraperAdapter(api_token="test-token")


@pytest.mark.asyncio
async def test_parse_images_array_with_uploaded_at(adapter):
    """When Apify returns images[] with uploadedAt, photos carry timestamps."""
    mock_result = {
        "title": "Fika Fika",
        "address": "台北市松山區伊通街33號",
        "location": {"lat": 25.052, "lng": 121.533},
        "placeId": "ChIJ_fika01",
        "images": [
            {
                "imageUrl": "https://lh5.googleusercontent.com/p/AF1Qip_photo1=w1920-h1080-k-no",
                "uploadedAt": "2025-06-15T10:30:00.000Z",
            },
            {
                "imageUrl": "https://lh5.googleusercontent.com/p/AF1Qip_photo2=w1920-h1080-k-no",
                "uploadedAt": "2024-01-10T08:00:00.000Z",
            },
        ],
        "imageUrls": ["https://old-flat-url.jpg"],
        "reviews": [],
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=fika")

    assert result is not None
    assert len(result.photos) == 2
    assert (
        result.photos[0].url == "https://lh5.googleusercontent.com/p/AF1Qip_photo1=w1920-h1080-k-no"
    )
    assert result.photos[0].uploaded_at is not None
    assert result.photos[0].uploaded_at.year == 2025


@pytest.mark.asyncio
async def test_age_filter_drops_photos_older_than_5_years(adapter):
    """Photos with uploadedAt older than 5 years are filtered out."""
    now = datetime.now(UTC)
    old_date = (now - timedelta(days=365 * 6)).isoformat()
    recent_date = (now - timedelta(days=30)).isoformat()

    mock_result = {
        "title": "Old & New",
        "address": "台北市中山區",
        "location": {"lat": 25.05, "lng": 121.52},
        "placeId": "ChIJ_oldnew",
        "images": [
            {"imageUrl": "https://cdn/old.jpg", "uploadedAt": old_date},
            {"imageUrl": "https://cdn/recent.jpg", "uploadedAt": recent_date},
        ],
        "reviews": [],
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=oldnew")

    assert len(result.photos) == 1
    assert result.photos[0].url == "https://cdn/recent.jpg"


@pytest.mark.asyncio
async def test_cap_at_30_photos_sorted_by_recency(adapter):
    """When more than 30 photos exist, only the 30 most recent are kept."""
    now = datetime.now(UTC)
    images = [
        {
            "imageUrl": f"https://cdn/photo{i}.jpg",
            "uploadedAt": (now - timedelta(days=i)).isoformat(),
        }
        for i in range(40)
    ]

    mock_result = {
        "title": "Many Photos",
        "address": "台北市",
        "location": {"lat": 25.0, "lng": 121.5},
        "placeId": "ChIJ_many",
        "images": images,
        "reviews": [],
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=many")

    assert len(result.photos) == 30
    # Most recent first (day 0 = today)
    assert "photo0" in result.photos[0].url


@pytest.mark.asyncio
async def test_fallback_to_image_urls_when_images_absent(adapter):
    """When images[] is absent, fall back to imageUrls with no uploaded_at."""
    mock_result = {
        "title": "Flat Only",
        "address": "台北市",
        "location": {"lat": 25.0, "lng": 121.5},
        "placeId": "ChIJ_flat",
        "imageUrls": ["https://cdn/a.jpg", "https://cdn/b.jpg"],
        "reviews": [],
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=flat")

    assert len(result.photos) == 2
    assert result.photos[0].uploaded_at is None
    assert result.photos[0].url == "https://cdn/a.jpg"


@pytest.mark.asyncio
async def test_scrape_by_url_returns_shop_data(adapter):
    """Full scrape result is parsed correctly (updated for photos field)."""
    mock_result = {
        "title": "Good Coffee",
        "address": "123 Test St, Taipei",
        "location": {"lat": 25.033, "lng": 121.565},
        "totalScore": 4.5,
        "reviewsCount": 42,
        "openingHours": [{"day": "Monday", "hours": "9:00 AM - 6:00 PM"}],
        "phone": "+886-2-1234-5678",
        "website": "https://goodcoffee.tw",
        "placeId": "ChIJ_test123",
        "reviews": [
            {"text": "Great latte", "stars": 5, "publishedAtDate": "2025-12-01"},
            {"text": "Nice ambience", "stars": 4, "publishedAtDate": "2025-11-15"},
        ],
        "imageUrls": ["https://img1.jpg", "https://img2.jpg"],
        "menu": "https://goodcoffee.tw/menu",
        "categoryName": "Coffee shop",
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=123")

    assert result is not None
    assert result.name == "Good Coffee"
    assert result.google_place_id == "ChIJ_test123"
    assert result.latitude == 25.033
    assert len(result.reviews) == 2
    assert len(result.photos) == 2
    assert result.opening_hours == ["Monday: 9:00 AM - 6:00 PM"]


@pytest.mark.asyncio
async def test_scrape_by_url_returns_none_when_not_found(adapter):
    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = []
        result = await adapter.scrape_by_url("https://maps.google.com/?cid=invalid")

    assert result is None


@pytest.mark.asyncio
async def test_scrape_reviews_only_returns_reviews(adapter):
    mock_result = {
        "placeId": "ChIJ_test123",
        "reviews": [
            {"text": "New review", "stars": 5, "publishedAtDate": "2026-02-01"},
        ],
    }

    with patch.object(adapter, "_run_actor", new_callable=AsyncMock) as mock_run:
        mock_run.return_value = [mock_result]
        reviews = await adapter.scrape_reviews_only("ChIJ_test123")

    assert len(reviews) == 1
    assert reviews[0]["text"] == "New review"
