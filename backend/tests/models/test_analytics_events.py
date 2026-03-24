# backend/tests/models/test_analytics_events.py
import pytest
from pydantic import ValidationError

from models.analytics_events import (
    PDPA_BLOCKED_FIELDS,
    AnalyticsEventRequest,
    sanitize_passthrough,
)


class TestSpecEventValidation:
    def test_search_submitted_valid(self):
        req = AnalyticsEventRequest(
            event="search_submitted",
            properties={
                "query_text": "latte",
                "query_type": "item_specific",
                "mode_chip_active": "work",
                "result_count": 5,
            },
        )
        assert req.event == "search_submitted"
        assert req.properties["query_text"] == "latte"

    def test_search_submitted_missing_required_field(self):
        with pytest.raises(ValidationError):
            AnalyticsEventRequest(
                event="search_submitted",
                properties={"query_text": "latte"},
            )

    def test_shop_detail_viewed_valid(self):
        req = AnalyticsEventRequest(
            event="shop_detail_viewed",
            properties={
                "shop_id": "abc-123",
                "referrer": "search",
                "session_search_query": "good wifi",
            },
        )
        assert req.properties["shop_id"] == "abc-123"

    def test_shop_url_copied_valid(self):
        req = AnalyticsEventRequest(
            event="shop_url_copied",
            properties={"shop_id": "abc-123", "copy_method": "clipboard"},
        )
        assert req.properties["copy_method"] == "clipboard"

    def test_checkin_completed_valid(self):
        req = AnalyticsEventRequest(
            event="checkin_completed",
            properties={
                "shop_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "has_text_note": True,
                "has_menu_photo": False,
            },
        )
        assert req.properties["shop_id"] == "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        # is_first_checkin_at_shop is NOT required from client — server enriches it
        assert "is_first_checkin_at_shop" not in req.properties

    def test_profile_stamps_viewed_valid(self):
        req = AnalyticsEventRequest(
            event="profile_stamps_viewed",
            properties={"stamp_count": 12},
        )
        assert req.properties["stamp_count"] == 12

    def test_filter_applied_valid(self):
        req = AnalyticsEventRequest(
            event="filter_applied",
            properties={"filter_type": "mode", "filter_value": "work"},
        )
        assert req.properties["filter_type"] == "mode"

    def test_session_start_valid(self):
        """session_start requires days_since_first_session and previous_sessions from client."""
        req = AnalyticsEventRequest(
            event="session_start",
            properties={"days_since_first_session": 23, "previous_sessions": 5},
        )
        assert req.event == "session_start"
        assert req.properties["days_since_first_session"] == 23
        assert req.properties["previous_sessions"] == 5


class TestPassthroughEvents:
    def test_unknown_event_passes_through(self):
        req = AnalyticsEventRequest(
            event="tarot_card_tapped",
            properties={"card_index": 2},
        )
        assert req.event == "tarot_card_tapped"

    def test_passthrough_gets_source_tag(self):
        props = sanitize_passthrough({"card_index": 2})
        assert props["source"] == "client"

    def test_passthrough_strips_pii_fields(self):
        props = sanitize_passthrough(
            {"card_index": 2, "email": "user@example.com", "user_id": "raw-id"}
        )
        assert "email" not in props
        assert "user_id" not in props
        assert props["card_index"] == 2
        assert props["source"] == "client"


class TestPDPABlockedFields:
    def test_blocked_fields_include_common_pii(self):
        assert "email" in PDPA_BLOCKED_FIELDS
        assert "phone" in PDPA_BLOCKED_FIELDS
        assert "user_id" in PDPA_BLOCKED_FIELDS
        assert "name" in PDPA_BLOCKED_FIELDS
