from core.config import settings
from providers.cache.interface import SearchCacheProvider


def get_search_cache_provider(db_client: object) -> SearchCacheProvider:
    match settings.search_cache_provider:
        case "supabase":
            from providers.cache.supabase_adapter import SupabaseSearchCacheAdapter

            return SupabaseSearchCacheAdapter(
                db=db_client,
                ttl_seconds=settings.search_cache_ttl_seconds,
            )
        case "none":
            from providers.cache.null_adapter import NullSearchCacheAdapter

            return NullSearchCacheAdapter()
        case _:
            raise ValueError(f"Unknown search cache provider: {settings.search_cache_provider}")
