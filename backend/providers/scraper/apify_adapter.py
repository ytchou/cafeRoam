import asyncio
from typing import Any

import structlog
from apify_client import ApifyClient

from providers.scraper.interface import ScrapedShopData

logger = structlog.get_logger()

_ACTOR_ID = "compass/crawler-google-places"


class ApifyScraperAdapter:
    """Apify Google Maps scraper implementation."""

    def __init__(self, api_token: str):
        self._client = ApifyClient(api_token)

    async def scrape_by_url(self, google_maps_url: str) -> ScrapedShopData | None:
        results = await self._run_actor(
            {
                "startUrls": [{"url": google_maps_url}],
                "maxCrawledPlacesPerSearch": 1,
                "maxReviews": 20,
                "maxImages": 10,
                "language": "zh-TW",
                "scrapeReviewerName": False,
            }
        )

        if not results:
            logger.warning("Apify returned no results", url=google_maps_url)
            return None

        place = results[0]
        location = place.get("location", {})

        return ScrapedShopData(
            name=place.get("title", ""),
            address=place.get("address", ""),
            latitude=location.get("lat", 0.0),
            longitude=location.get("lng", 0.0),
            google_place_id=place.get("placeId", ""),
            rating=place.get("totalScore"),
            review_count=place.get("reviewsCount", 0),
            opening_hours=place.get("openingHours"),
            phone=place.get("phone"),
            website=place.get("website"),
            menu_url=place.get("menu"),
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
            photo_urls=place.get("imageUrls", [])[:10],
        )

    async def scrape_reviews_only(self, google_place_id: str) -> list[dict[str, str | int | None]]:
        results = await self._run_actor(
            {
                "startUrls": [
                    {"url": f"https://www.google.com/maps/place/?q=place_id:{google_place_id}"}
                ],
                "maxCrawledPlacesPerSearch": 1,
                "maxReviews": 5,
                "maxImages": 0,
                "scrapeReviewerName": False,
            }
        )

        if not results:
            return []

        return [
            {
                "text": r.get("text", ""),
                "stars": r.get("stars"),
                "published_at": r.get("publishedAtDate"),
            }
            for r in results[0].get("reviews", [])
            if r.get("text")
        ]

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
