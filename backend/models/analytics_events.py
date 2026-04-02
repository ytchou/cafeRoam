"""Pydantic models for the analytics event gateway.

Per-event typed property validation for the 7 spec events (metrics.md).
Passthrough with PDPA filtering for all other events.
"""

import uuid as _uuid
from typing import Any

from pydantic import BaseModel, field_validator, model_validator

# --- Spec event names ---
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


def _strip_pdpa_fields(properties: dict[str, Any]) -> dict[str, Any]:
    """Remove PDPA-blocked fields from a properties dict."""
    return {k: v for k, v in properties.items() if k not in PDPA_BLOCKED_FIELDS}


def sanitize_passthrough(properties: dict[str, Any]) -> dict[str, Any]:
    """Strip PDPA-blocked fields and add source tag for passthrough events."""
    cleaned = _strip_pdpa_fields(properties)
    cleaned["source"] = "client"
    return cleaned


# --- Per-event typed property models ---


class SearchSubmittedProperties(BaseModel):
    query_text: str
    query_type: str
    mode_chip_active: str
    result_count: int


class ShopDetailViewedProperties(BaseModel):
    shop_id: str
    referrer: str
    session_search_query: str | None = None


class ShopUrlCopiedProperties(BaseModel):
    shop_id: str
    copy_method: str


class CheckinCompletedProperties(BaseModel):
    shop_id: str
    has_text_note: bool
    has_menu_photo: bool

    @field_validator("shop_id")
    @classmethod
    def validate_shop_id_uuid(cls, v: str) -> str:
        try:
            _uuid.UUID(v)
        except (ValueError, AttributeError):
            raise ValueError(f"shop_id must be a valid UUID, got: {v!r}") from None
        return v


class ProfileStampsViewedProperties(BaseModel):
    stamp_count: int


class FilterAppliedProperties(BaseModel):
    filter_type: str
    filter_value: list[str]


class SessionStartProperties(BaseModel):
    """Properties for session_start — provided by the client from the heartbeat response.

    SessionTracker calls /api/auth/session-heartbeat first, then passes the
    returned values here. The gateway validates they are present and typed.
    """

    days_since_first_session: int
    previous_sessions: int


# Registry: event name → property model class
_SPEC_EVENT_MODELS: dict[str, type[BaseModel]] = {
    "search_submitted": SearchSubmittedProperties,
    "shop_detail_viewed": ShopDetailViewedProperties,
    "shop_url_copied": ShopUrlCopiedProperties,
    "checkin_completed": CheckinCompletedProperties,
    "profile_stamps_viewed": ProfileStampsViewedProperties,
    "filter_applied": FilterAppliedProperties,
    "session_start": SessionStartProperties,
}


class AnalyticsEventRequest(BaseModel):
    """Incoming analytics event from frontend.

    For spec events: properties are validated against a per-event typed model.
    Extra properties (including any PII) are stripped during validation.
    For other events: accepts any properties (PDPA filtering at the endpoint layer).
    """

    event: str
    properties: dict[str, Any] = {}

    @model_validator(mode="after")
    def validate_spec_event_properties(self) -> "AnalyticsEventRequest":
        if self.event in _SPEC_EVENT_MODELS:
            validated = _SPEC_EVENT_MODELS[self.event].model_validate(self.properties)
            # Replace with only validated, typed fields — strips extras and PII automatically
            self.properties = validated.model_dump(exclude_none=True)
        return self
