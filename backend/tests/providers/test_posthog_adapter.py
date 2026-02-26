from unittest.mock import patch

from providers.analytics.posthog_adapter import PostHogAnalyticsAdapter


class TestPostHogTrack:
    @patch("providers.analytics.posthog_adapter.posthog")
    def test_calls_capture_with_event(self, mock_posthog):
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        adapter.track("shop_viewed", {"shop_id": "s1"})

        mock_posthog.capture.assert_called_once_with(
            distinct_id="server",
            event="shop_viewed",
            properties={"shop_id": "s1"},
        )

    @patch("providers.analytics.posthog_adapter.posthog")
    def test_calls_capture_without_properties(self, mock_posthog):
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        adapter.track("app_started")

        mock_posthog.capture.assert_called_once_with(
            distinct_id="server",
            event="app_started",
            properties=None,
        )


class TestPostHogIdentify:
    @patch("providers.analytics.posthog_adapter.posthog")
    def test_calls_identify_with_user_id_and_traits(self, mock_posthog):
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        adapter.identify("user-123", {"plan": "free"})

        mock_posthog.identify.assert_called_once_with(
            distinct_id="user-123",
            properties={"plan": "free"},
        )


class TestPostHogPage:
    @patch("providers.analytics.posthog_adapter.posthog")
    def test_maps_to_pageview_event(self, mock_posthog):
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        adapter.page("/shops/123", {"referrer": "search"})

        mock_posthog.capture.assert_called_once_with(
            distinct_id="server",
            event="$pageview",
            properties={"$current_url": "/shops/123", "referrer": "search"},
        )

    @patch("providers.analytics.posthog_adapter.posthog")
    def test_page_with_no_properties(self, mock_posthog):
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        adapter.page("/home")

        mock_posthog.capture.assert_called_once_with(
            distinct_id="server",
            event="$pageview",
            properties={"$current_url": "/home"},
        )


class TestPostHogErrorHandling:
    @patch("providers.analytics.posthog_adapter.posthog")
    def test_track_swallows_exceptions(self, mock_posthog):
        mock_posthog.capture.side_effect = Exception("Network error")
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")

        # Should not raise
        adapter.track("test_event")

    @patch("providers.analytics.posthog_adapter.posthog")
    def test_identify_swallows_exceptions(self, mock_posthog):
        mock_posthog.identify.side_effect = Exception("Network error")
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")

        # Should not raise
        adapter.identify("user-1")

    @patch("providers.analytics.posthog_adapter.posthog")
    def test_page_swallows_exceptions(self, mock_posthog):
        mock_posthog.capture.side_effect = Exception("Network error")
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")

        # Should not raise
        adapter.page("/test")


class TestPostHogInit:
    @patch("providers.analytics.posthog_adapter.posthog")
    def test_sets_api_key_and_host(self, mock_posthog):
        PostHogAnalyticsAdapter(api_key="pk_test_123", host="https://custom.posthog.com")

        assert mock_posthog.project_api_key == "pk_test_123"
        assert mock_posthog.host == "https://custom.posthog.com"
        assert mock_posthog.debug is False
