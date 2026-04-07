import asyncio
import contextlib
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from apify_client import ApifyClient

from core.opening_hours import parse_to_structured
from providers.scraper.interface import (
    BatchScrapeInput,
    BatchScrapeResult,
    ScrapedPhotoData,
    ScrapedShopData,
)

logger = structlog.get_logger()

_ACTOR_ID = "compass/crawler-google-places"
_PHOTO_MAX_AGE = timedelta(days=365 * 3)
_PHOTO_CAP = 30

_FEATURE_MAP: dict[str, str] = {
    "Outdoor seating": "outdoor_seating",
    "Wheelchair-accessible entrance": "wheelchair_accessible",
    "Wi-Fi": "wifi",
    "Takeout": "takeout",
    "Dine-in": "dine_in",
}
_ACTOR_BASE_INPUT: dict[str, Any] = {
    "maxCrawledPlacesPerSearch": 1,
    "maxReviews": 20,
    "maxImages": 15,
    "language": "zh-TW",
    "skipClosedPlaces": True,
    "scrapeReviewerName": False,
    "scrapeReviewsPersonalData": False,
    "scrapeSocialMediaProfiles": {"instagrams": True, "facebooks": True},
}


class ApifyScraperAdapter:
    """Apify Google Maps scraper implementation."""

    def __init__(self, api_token: str):
        self._client = ApifyClient(api_token)

    async def scrape_batch(self, shops: list[BatchScrapeInput]) -> list[BatchScrapeResult]:
        """Scrape multiple shops in a single Apify actor run.

        Matches results back to input shops via userData.shopId, which the
        crawler-google-places actor merges into each output item verbatim.

        URL/path matching is unreliable because Apify converts /maps/place/...
        URLs to /maps/search/?api=1&query=... internally, so the output URL
        never matches the input URL.
        """
        if not shops:
            return []

        url_to_shop_id: dict[str, str] = {}
        for s in shops:
            if s.google_maps_url in url_to_shop_id:
                logger.warning(
                    "scrape_batch: duplicate URL in input, skipping",
                    url=s.google_maps_url[:80],
                    kept_shop_id=url_to_shop_id[s.google_maps_url],
                    dropped_shop_id=s.shop_id,
                )
            else:
                url_to_shop_id[s.google_maps_url] = s.shop_id
        start_urls = [{"url": url} for url in url_to_shop_id]

        results = await self._run_actor({**_ACTOR_BASE_INPUT, "startUrls": start_urls})

        matched: dict[str, ScrapedShopData] = {}
        for place in results:
            # inputStartUrl is the original URL we sent — exact match is reliable.
            # (Apify converts place URLs to search URLs in its output `url` field,
            # making that field useless for correlation.)
            input_url = place.get("inputStartUrl", "")
            shop_id = url_to_shop_id.get(input_url)
            if shop_id:
                matched[shop_id] = self._parse_place(place)
            else:
                logger.warning("scrape_batch: no match for inputStartUrl", url=input_url[:80])

        return [BatchScrapeResult(shop_id=s.shop_id, data=matched.get(s.shop_id)) for s in shops]

    def _parse_place(self, place: dict[str, Any]) -> ScrapedShopData:
        """Parse a raw Apify place dict into ScrapedShopData."""
        location = place.get("location") or {}
        return ScrapedShopData(
            name=place.get("title", ""),
            address=place.get("address", ""),
            latitude=location.get("lat", 0.0),
            longitude=location.get("lng", 0.0),
            google_place_id=place.get("placeId", ""),
            rating=place.get("totalScore"),
            review_count=place.get("reviewsCount", 0),
            opening_hours=self._normalize_opening_hours(place.get("openingHours")),
            phone=place.get("phone"),
            website=place.get("website"),
            menu_url=place.get("menu"),
            instagram_url=next(iter(place.get("instagrams") or []), None),
            facebook_url=next(iter(place.get("facebooks") or []), None),
            country_code=place.get("countryCode"),
            price_range=place.get("price"),
            permanently_closed=bool(place.get("permanentlyClosed", False)),
            categories=[place["categoryName"]] if place.get("categoryName") else [],
            reviews=[
                {
                    "text": r.get("text", ""),
                    "stars": r.get("stars"),
                    "published_at": r.get("publishedAtDate"),
                }
                for r in place.get("reviews", [])
                if r.get("text")
            ],
            photos=self._parse_photos(place),
            google_maps_features=self._extract_maps_features(place),
        )

    @staticmethod
    def _normalize_opening_hours(
        raw_hours: list[dict[str, str]] | None,
    ) -> list[dict[str, int | None]] | None:
        """Convert raw Apify openingHours to structured format."""
        if not raw_hours:
            return None
        strings = [
            f"{h.get('day', '')}: {h.get('hours', '')}".strip(": ")
            for h in raw_hours
            if isinstance(h, dict)
        ]
        if not strings:
            return None
        structured = parse_to_structured(strings)
        return [s.model_dump() for s in structured] if structured else None

    @staticmethod
    def _extract_maps_features(place: dict[str, Any]) -> dict[str, bool]:
        """Extract physical features from Apify additionalInfo into tag-id-keyed dict."""
        additional_info = place.get("additionalInfo") or {}
        result: dict[str, bool] = {}
        for category_values in additional_info.values():
            if not isinstance(category_values, dict):
                continue
            for feature_name, feature_value in category_values.items():
                if feature_value is True and feature_name in _FEATURE_MAP:
                    result[_FEATURE_MAP[feature_name]] = True
        return result

    def _parse_photos(self, place: dict[str, Any]) -> list[ScrapedPhotoData]:
        """Parse photos from images[] (preferred) or imageUrls[] (fallback)."""
        images = place.get("images")
        if images and isinstance(images, list):
            return self._parse_images_array(images)
        # Fallback: flat imageUrls with no metadata
        return [ScrapedPhotoData(url=url) for url in place.get("imageUrls", [])[:_PHOTO_CAP]]

    def _parse_images_array(self, images: list[dict[str, Any]]) -> list[ScrapedPhotoData]:
        """Parse rich images[] objects, filter by age, cap, sort by recency."""
        now = datetime.now(UTC)
        cutoff = now - _PHOTO_MAX_AGE
        photos: list[ScrapedPhotoData] = []

        for img in images:
            url = img.get("imageUrl")
            if not url:
                continue
            uploaded_at = None
            raw_date = img.get("uploadedAt")
            if raw_date:
                with contextlib.suppress(ValueError, AttributeError):
                    uploaded_at = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            # Age filter: skip old photos (only when we have a date)
            if uploaded_at and uploaded_at < cutoff:
                continue
            photos.append(ScrapedPhotoData(url=url, uploaded_at=uploaded_at))

        return photos[:_PHOTO_CAP]

    async def _run_actor(self, run_input: dict[str, Any]) -> list[dict[str, Any]]:
        """Run Apify actor synchronously in a thread pool (client is sync)."""

        def _sync_run() -> list[dict[str, Any]]:
            run = self._client.actor(_ACTOR_ID).call(run_input=run_input)
            if run is None:
                return []
            items = list(self._client.dataset(run["defaultDatasetId"]).iterate_items())
            return items

        return await asyncio.to_thread(_sync_run)

    async def close(self) -> None:
        pass
