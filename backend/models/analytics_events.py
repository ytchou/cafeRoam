"""Pydantic models for the analytics event gateway.

Strict validation for the 7 spec events (metrics.md).
Passthrough with PDPA filtering for all other events.
"""

from typing import Any

from pydantic import BaseModel, model_validator

# --- Spec event names (strict validation path) ---
SPEC_EVENTS = frozenset(
    {
        "search_submitted",
        "shop_detail_viewed",
        "shop_url_copied",
        "checkin_completed",
        "profile_stamps_viewed",
        "filter_applied",
        "session_start",
    }
)

# --- PDPA blocklist for passthrough events ---
PDPA_BLOCKED_FIELDS = frozenset({"email", "phone", "user_id", "name", "address"})

# --- Per-event required property keys (client-provided only) ---
_REQUIRED_PROPS: dict[str, set[str]] = {
    "search_submitted": {"query_text", "query_type", "mode_chip_active", "result_count"},
    "shop_detail_viewed": {"shop_id", "referrer", "session_search_query"},
    "shop_url_copied": {"shop_id", "copy_method"},
    "checkin_completed": {"shop_id", "has_text_note", "has_menu_photo"},
    "profile_stamps_viewed": {"stamp_count"},
    "filter_applied": {"filter_type", "filter_value"},
    "session_start": set(),  # all properties are server-enriched
}


def sanitize_passthrough(properties: dict[str, Any]) -> dict[str, Any]:
    """Strip PDPA-blocked fields and add source tag for passthrough events."""
    cleaned = {k: v for k, v in properties.items() if k not in PDPA_BLOCKED_FIELDS}
    cleaned["source"] = "client"
    return cleaned


class AnalyticsEventRequest(BaseModel):
    """Incoming analytics event from frontend.

    For spec events: validates required properties.
    For other events: accepts any properties (PDPA filtering happens at the endpoint layer).
    """

    event: str
    properties: dict[str, Any] = {}

    @model_validator(mode="after")
    def validate_spec_event_properties(self) -> "AnalyticsEventRequest":
        if self.event in SPEC_EVENTS:
            required = _REQUIRED_PROPS[self.event]
            missing = required - set(self.properties.keys())
            if missing:
                raise ValueError(
                    f"Event '{self.event}' missing required properties: {sorted(missing)}"
                )
        return self
