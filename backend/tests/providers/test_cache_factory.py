from unittest.mock import MagicMock, patch

from providers.cache import get_search_cache_provider
from providers.cache.null_adapter import NullSearchCacheAdapter


class TestSearchCacheFactory:
    def test_factory_returns_supabase_adapter(self):
        with patch("providers.cache.settings") as mock_settings:
            mock_settings.search_cache_provider = "supabase"
            mock_settings.search_cache_ttl_seconds = 14400
            mock_db = MagicMock()
            provider = get_search_cache_provider(mock_db)
            assert provider is not None

    def test_factory_returns_null_adapter_when_disabled(self):
        with patch("providers.cache.settings") as mock_settings:
            mock_settings.search_cache_provider = "none"
            provider = get_search_cache_provider(MagicMock())
            assert isinstance(provider, NullSearchCacheAdapter)

    def test_factory_raises_for_unknown_provider(self):
        with patch("providers.cache.settings") as mock_settings:
            mock_settings.search_cache_provider = "redis"
            import pytest

            with pytest.raises(ValueError, match="Unknown search cache provider"):
                get_search_cache_provider(MagicMock())
