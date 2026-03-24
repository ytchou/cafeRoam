from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_admin_db, get_current_user, get_user_db
from main import app
from providers.analytics import get_analytics_provider

client = TestClient(app)


def _setup_overrides(mock_analytics=None, user_id="user-test-123"):
    """Set up common dependency overrides for analytics tests."""
    mock_db = MagicMock()
    if mock_analytics is None:
        mock_analytics = MagicMock()
    app.dependency_overrides[get_current_user] = lambda: {"id": user_id}
    app.dependency_overrides[get_user_db] = lambda: mock_db
    app.dependency_overrides[get_admin_db] = lambda: MagicMock()
    app.dependency_overrides[get_analytics_provider] = lambda: mock_analytics
    return mock_analytics


class TestAnalyticsEndpointAuth:
    def test_requires_auth(self):
        response = client.post(
            "/analytics/events",
            json={"event": "filter_applied", "properties": {"filter_type": "mode", "filter_value": "work"}},
        )
        assert response.status_code == 401

    def test_returns_ok_for_valid_event(self):
        _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "filter_applied",
                    "properties": {"filter_type": "mode", "filter_value": "work"},
                },
            )
            assert response.status_code == 200
            assert response.json()["status"] == "ok"
        finally:
            app.dependency_overrides.clear()


class TestAnalyticsSpecEvents:
    def test_spec_event_fires_posthog_with_anonymized_id(self):
        mock_analytics = _setup_overrides(user_id="user-abc-real-id")
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "filter_applied",
                    "properties": {"filter_type": "mode", "filter_value": "work"},
                },
            )
            assert response.status_code == 200
            mock_analytics.track.assert_called_once()
            call_kwargs = mock_analytics.track.call_args
            # distinct_id must be anonymized, not raw user ID
            assert call_kwargs[1]["distinct_id"] != "user-abc-real-id"
            assert len(call_kwargs[1]["distinct_id"]) == 64  # SHA-256 hex
        finally:
            app.dependency_overrides.clear()

    def test_spec_event_rejects_missing_properties(self):
        _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "search_submitted",
                    "properties": {"query_text": "latte"},
                },
            )
            assert response.status_code == 422
        finally:
            app.dependency_overrides.clear()

    def test_checkin_completed_enriches_is_first(self):
        """checkin_completed should resolve is_first_checkin_at_shop from DB."""
        mock_analytics = _setup_overrides(user_id="user-checkin-test")
        mock_admin_db = MagicMock()
        # Simulate: user has 0 previous check-ins at this shop
        mock_admin_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            count=0
        )
        app.dependency_overrides[get_admin_db] = lambda: mock_admin_db
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "checkin_completed",
                    "properties": {
                        "shop_id": "shop-xyz",
                        "has_text_note": True,
                        "has_menu_photo": False,
                    },
                },
            )
            assert response.status_code == 200
            call_args = mock_analytics.track.call_args
            props = call_args[0][1]
            assert props["is_first_checkin_at_shop"] is True
        finally:
            app.dependency_overrides.clear()

    def test_session_start_enriches_from_heartbeat(self):
        """session_start should call session_heartbeat and enrich properties."""
        mock_analytics = _setup_overrides(user_id="user-session-test")
        mock_user_db = MagicMock()
        mock_user_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"session_count": 5, "first_session_at": "2026-03-01T00:00:00+00:00", "last_session_at": "2026-03-23T00:00:00+00:00"}
        )
        app.dependency_overrides[get_user_db] = lambda: mock_user_db
        try:
            with patch("api.analytics.ProfileService") as MockProfileService:
                mock_service = MockProfileService.return_value
                mock_service.session_heartbeat = AsyncMock(return_value={
                    "days_since_first_session": 23,
                    "previous_sessions": 5,
                })
                response = client.post(
                    "/analytics/events",
                    json={"event": "session_start", "properties": {}},
                )
                assert response.status_code == 200
                call_args = mock_analytics.track.call_args
                props = call_args[0][1]
                assert props["days_since_first_session"] == 23
                assert props["previous_sessions"] == 5
        finally:
            app.dependency_overrides.clear()


class TestAnalyticsPassthrough:
    def test_passthrough_event_fires_with_source_tag(self):
        mock_analytics = _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "tarot_card_tapped",
                    "properties": {"card_index": 2},
                },
            )
            assert response.status_code == 200
            call_args = mock_analytics.track.call_args
            props = call_args[0][1]
            assert props["source"] == "client"
            assert props["card_index"] == 2
        finally:
            app.dependency_overrides.clear()

    def test_passthrough_strips_pii(self):
        mock_analytics = _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "custom_event",
                    "properties": {"email": "user@test.com", "value": 42},
                },
            )
            assert response.status_code == 200
            call_args = mock_analytics.track.call_args
            props = call_args[0][1]
            assert "email" not in props
            assert props["value"] == 42
        finally:
            app.dependency_overrides.clear()
