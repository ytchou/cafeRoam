from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from api.deps import get_admin_db, get_current_user
from main import app
from providers.analytics import get_analytics_provider

client = TestClient(app)


def _setup_overrides(mock_analytics=None, user_id="usr_test_a1b2c3d4"):
    """Set up common dependency overrides for analytics tests."""
    if mock_analytics is None:
        mock_analytics = MagicMock()
    app.dependency_overrides[get_current_user] = lambda: {"id": user_id}
    app.dependency_overrides[get_admin_db] = lambda: MagicMock()
    app.dependency_overrides[get_analytics_provider] = lambda: mock_analytics
    return mock_analytics


class TestAnalyticsEndpointAuth:
    def test_requires_auth(self):
        response = client.post(
            "/analytics/events",
            json={
                "event": "filter_applied",
                "properties": {"filter_type": "mode", "filter_value": "work"},
            },
        )
        assert response.status_code == 401

    def test_returns_ok_for_valid_event(self):
        _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "filter_applied",
                    "properties": {"filter_type": "mode", "filter_value": ["work"]},
                },
            )
            assert response.status_code == 200
            assert response.json()["status"] == "ok"
        finally:
            app.dependency_overrides.clear()


class TestAnalyticsSpecEvents:
    def test_spec_event_fires_posthog_with_anonymized_id(self):
        mock_analytics = _setup_overrides(user_id="usr_a1b2c3d4e5f6")
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "filter_applied",
                    "properties": {"filter_type": "mode", "filter_value": ["work"]},
                },
            )
            assert response.status_code == 200
            mock_analytics.track.assert_called_once()
            call_kwargs = mock_analytics.track.call_args
            # distinct_id must be anonymized, not raw user ID
            assert call_kwargs[1]["distinct_id"] != "usr_a1b2c3d4e5f6"
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
                        "shop_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

    def test_session_start_forwards_client_properties_to_posthog(self):
        """session_start properties from the heartbeat response reach PostHog unchanged."""
        mock_analytics = _setup_overrides(user_id="usr_a1b2c3d4e5f6")
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "session_start",
                    "properties": {
                        "days_since_first_session": 23,
                        "previous_sessions": 5,
                    },
                },
            )
            assert response.status_code == 200
            call_args = mock_analytics.track.call_args
            props = call_args[0][1]
            assert props["days_since_first_session"] == 23
            assert props["previous_sessions"] == 5
        finally:
            app.dependency_overrides.clear()


class TestFilterApplied:
    def test_filter_applied_accepts_array_filter_value(self):
        """filter_applied should accept filter_value as a list of tag slugs.

        The frontend (filter-sheet.tsx) sends selectedIds as string[]. A str-only
        Pydantic model would reject this with 422, silently dropping all filter events.
        """
        _setup_overrides()
        try:
            response = client.post(
                "/analytics/events",
                json={
                    "event": "filter_applied",
                    "properties": {
                        "filter_type": "sheet",
                        "filter_value": ["wifi", "quiet", "outdoor_seating"],
                    },
                },
            )
            assert response.status_code == 200
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
