from unittest.mock import patch

from providers.analytics.null_adapter import NullAnalyticsAdapter


class TestNullAnalyticsAdapter:
    def setup_method(self):
        self.adapter = NullAnalyticsAdapter()

    def test_track_does_not_raise(self):
        """Null adapter silently absorbs track calls without error"""
        self.adapter.track("page_view", {"shop_id": "abc"}, distinct_id="user-1")

    def test_identify_does_not_raise(self):
        """Null adapter silently absorbs identify calls without error"""
        self.adapter.identify("user-uuid-1", {"plan": "free"})

    def test_page_does_not_raise(self):
        """Null adapter silently absorbs page calls without error"""
        self.adapter.page("/shops/uuid-1", {"referrer": "search"})

    def test_query_hogql_returns_empty_list(self):
        """Null adapter returns empty results for all HogQL queries"""
        result = self.adapter.query_hogql("SELECT count() FROM events WHERE 1=1")
        assert result == []


class TestAnalyticsProviderFactory:
    def test_returns_null_adapter_when_provider_is_unset(self):
        """Environments without analytics configured get a no-op adapter, not a crash"""
        with patch("providers.analytics.settings") as mock_settings:
            mock_settings.analytics_provider = None
            from providers.analytics import get_analytics_provider

            adapter = get_analytics_provider()
        assert isinstance(adapter, NullAnalyticsAdapter)

    def test_returns_null_adapter_for_unknown_provider(self):
        """Unknown provider names degrade gracefully rather than raising ValueError"""
        with patch("providers.analytics.settings") as mock_settings:
            mock_settings.analytics_provider = "unknown_provider"
            from providers.analytics import get_analytics_provider

            adapter = get_analytics_provider()
        assert isinstance(adapter, NullAnalyticsAdapter)
