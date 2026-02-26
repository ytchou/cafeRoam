from core.config import settings
from providers.scraper.interface import ScraperProvider


def get_scraper_provider() -> ScraperProvider:
    match settings.scraper_provider:
        case "apify":
            from providers.scraper.apify_adapter import ApifyScraperAdapter

            return ApifyScraperAdapter(api_token=settings.apify_api_token)
        case _:
            raise ValueError(f"Unknown scraper provider: {settings.scraper_provider}")
