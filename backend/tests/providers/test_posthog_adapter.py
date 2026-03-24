from unittest.mock import MagicMock, patch

from providers.analytics.posthog_adapter import PostHogAnalyticsAdapter


class TestPostHogAnalyticsAdapter:
    def test_track_uses_server_distinct_id_by_default(self):
        """When no distinct_id is provided, events use 'server' as the identifier."""
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_ph:
            mock_client = MagicMock()
            mock_ph.Client.return_value = mock_client
            adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test")
            adapter.track("test_event", {"foo": "bar"})
            mock_client.capture.assert_called_once_with(
                distinct_id="server",
                event="test_event",
                properties={"foo": "bar"},
            )

    def test_track_uses_provided_distinct_id(self):
        """When a distinct_id is provided, events use it instead of 'server'."""
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_ph:
            mock_client = MagicMock()
            mock_ph.Client.return_value = mock_client
            adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test")
            adapter.track("search_submitted", {"query_text": "latte"}, distinct_id="anon-abc123")
            mock_client.capture.assert_called_once_with(
                distinct_id="anon-abc123",
                event="search_submitted",
                properties={"query_text": "latte"},
            )

    def test_track_swallows_exceptions(self):
        """When PostHog client raises, the adapter logs a warning and does not re-raise."""
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_ph:
            mock_client = MagicMock()
            mock_client.capture.side_effect = RuntimeError("network error")
            mock_ph.Client.return_value = mock_client
            adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test")
            # Should not raise
            adapter.track("test_event", {"foo": "bar"})
