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


class TestPostHogQueryHogQL:
    def _make_adapter(self, project_id: str = "12345") -> PostHogAnalyticsAdapter:
        with patch("providers.analytics.posthog_adapter.posthog_module") as mock_module:
            mock_module.Client.return_value = MagicMock()
            return PostHogAnalyticsAdapter(
                api_key="test-api-key",
                host="https://ph.test.com",
                project_id=project_id,
            )

    def test_query_hogql_returns_column_mapped_rows(self):
        """PostHog adapter maps HogQL response columns to row dicts"""
        adapter = self._make_adapter(project_id="99887")
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "columns": ["query", "impressions"],
            "results": [
                ["安靜工作空間", 28],
                ["寵物友善咖啡", 15],
            ],
        }

        with patch("providers.analytics.posthog_adapter.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            rows = adapter.query_hogql(
                "SELECT properties.query, count() FROM events GROUP BY query"
            )

        assert len(rows) == 2
        assert rows[0] == {"query": "安靜工作空間", "impressions": 28}
        assert rows[1] == {"query": "寵物友善咖啡", "impressions": 15}

    def test_query_hogql_returns_empty_list_on_posthog_error_response(self):
        """PostHog adapter returns empty list when response lacks expected columns/results keys"""
        adapter = self._make_adapter(project_id="99887")
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"error": "syntax error in query"}

        with patch("providers.analytics.posthog_adapter.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            rows = adapter.query_hogql("SELECT broken query FROM")

        assert rows == []

    def test_query_hogql_returns_empty_list_on_http_error(self):
        """PostHog adapter returns empty list when HTTP request fails"""
        adapter = self._make_adapter(project_id="99887")

        with patch("providers.analytics.posthog_adapter.httpx") as mock_httpx:
            mock_httpx.post.side_effect = Exception("Connection refused")
            rows = adapter.query_hogql("SELECT count() FROM events")

        assert rows == []

    def test_query_hogql_posts_to_correct_url(self):
        """PostHog adapter posts HogQL query to the project-scoped query endpoint"""
        adapter = self._make_adapter(project_id="42")
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"columns": ["views"], "results": [[100]]}

        with patch("providers.analytics.posthog_adapter.httpx") as mock_httpx:
            mock_httpx.post.return_value = mock_response
            adapter.query_hogql("SELECT count() as views FROM events")

        call_args = mock_httpx.post.call_args
        assert "42" in call_args.args[0]
        assert "json" in call_args.kwargs
        assert "query" in call_args.kwargs["json"]

    def test_query_hogql_returns_empty_list_when_project_id_missing(self):
        """PostHog adapter returns empty list when no project_id is configured"""
        adapter = self._make_adapter(project_id="")
        rows = adapter.query_hogql("SELECT count() FROM events")
        assert rows == []
