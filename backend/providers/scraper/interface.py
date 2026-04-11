from datetime import datetime
from typing import Protocol, runtime_checkable

from pydantic import BaseModel


class ScrapedPhotoData(BaseModel):
    """A single photo from the scraper with optional upload timestamp."""

    url: str
    uploaded_at: datetime | None = None


class ScrapedShopData(BaseModel):
    """Data scraped from Google Maps via Apify."""

    name: str
    address: str
    latitude: float
    longitude: float
    google_place_id: str
    rating: float | None = None
    review_count: int = 0
    opening_hours: list[dict[str, int | None]] | None = None
    phone: str | None = None
    website: str | None = None
    menu_url: str | None = None
    instagram_url: str | None = None
    facebook_url: str | None = None
    threads_url: str | None = None
    country_code: str | None = None
    price_range: str | None = None
    permanently_closed: bool = False
    categories: list[str] = []
    reviews: list[dict[str, str | int | None]] = []
    photos: list[ScrapedPhotoData] = []
    google_maps_features: dict[str, bool] = {}


class BatchScrapeInput(BaseModel):
    shop_id: str
    google_maps_url: str


class BatchScrapeResult(BaseModel):
    shop_id: str
    data: ScrapedShopData | None


@runtime_checkable
class ScraperProvider(Protocol):
    async def scrape_batch(self, shops: list[BatchScrapeInput]) -> list[BatchScrapeResult]:
        """Scrape multiple shops in a single Apify actor run."""
        ...

    async def close(self) -> None:
        """Clean up resources."""
        ...
