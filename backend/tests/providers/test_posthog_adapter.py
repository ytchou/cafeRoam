from unittest.mock import MagicMock, patch

from providers.analytics.posthog_adapter import PostHogAnalyticsAdapter


def _make_adapter():
    """Create adapter with a mocked posthog.Client instance."""
    with patch("providers.analytics.posthog_adapter.posthog_module") as mock_module:
        mock_client = MagicMock()
        mock_module.Client.return_value = mock_client
        adapter = PostHogAnalyticsAdapter(api_key="test-key", host="https://ph.test.com")
        return adapter, mock_client, mock_module


class TestPostHogTrack:
    def test_calls_capture_with_event(self):
        adapter, mock_client, _ = _make_adapter()
        adapter.track("shop_viewed", {"shop_id": "s1"})

        mock_client.capture.assert_called_once_with(
            distinct_id="server",
            event="shop_viewed",
            properties={"shop_id": "s1"},
        )

    def test_calls_capture_without_properties(self):
        adapter, mock_client, _ = _make_adapter()
        adapter.track("app_started")

        mock_client.capture.assert_called_once_with(
            distinct_id="server",
            event="app_started",
            properties=None,
        )


class TestPostHogIdentify:
    def test_calls_identify_with_user_id_and_traits(self):
        adapter, mock_client, _ = _make_adapter()
        adapter.identify("user-123", {"plan": "free"})

        mock_client.identify.assert_called_once_with(
            distinct_id="user-123",
            properties={"plan": "free"},
        )


class TestPostHogPage:
    def test_maps_to_pageview_event(self):
        adapter, mock_client, _ = _make_adapter()
        adapter.page("/shops/123", {"referrer": "search"})

        mock_client.capture.assert_called_once_with(
            distinct_id="server",
            event="$pageview",
            properties={"$current_url": "/shops/123", "referrer": "search"},
        )

    def test_page_with_no_properties(self):
        adapter, mock_client, _ = _make_adapter()
        adapter.page("/home")

        mock_client.capture.assert_called_once_with(
            distinct_id="server",
            event="$pageview",
            properties={"$current_url": "/home"},
        )


class TestPostHogErrorHandling:
    def test_track_swallows_exceptions(self):
        adapter, mock_client, _ = _make_adapter()
        mock_client.capture.side_effect = Exception("Network error")
        # Should not raise
        adapter.track("test_event")

    def test_identify_swallows_exceptions(self):
        adapter, mock_client, _ = _make_adapter()
        mock_client.identify.side_effect = Exception("Network error")
        # Should not raise
        adapter.identify("user-1")

    def test_page_swallows_exceptions(self):
        adapter, mock_client, _ = _make_adapter()
        mock_client.capture.side_effect = Exception("Network error")
        # Should not raise
        adapter.page("/test")


class TestPostHogInit:
    def test_constructs_client_with_api_key_and_host(self):
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_module:
            mock_module.Client.return_value = MagicMock()
            PostHogAnalyticsAdapter(api_key="pk_test_123", host="https://custom.posthog.com")

            mock_module.Client.assert_called_once_with(
                project_api_key="pk_test_123",
                host="https://custom.posthog.com",
                debug=False,
                on_error=mock_module.Client.call_args.kwargs["on_error"],
            )

    def test_on_error_callback_is_set(self):
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_module:
            mock_module.Client.return_value = MagicMock()
            PostHogAnalyticsAdapter(api_key="key", host="https://ph.test.com")

            call_kwargs = mock_module.Client.call_args.kwargs
            assert callable(call_kwargs["on_error"])
