# Typed Pydantic Models Are Stronger Than PDPA Blocklists

**Date:** 2026-03-24
**Context:** Analytics gateway code review — `POST /analytics/events` spec events path

**What happened:**
The original `analytics_events.py` used a flat `AnalyticsEventRequest` model with `properties: dict[str, Any]` and a `model_validator` that only checked for required key presence. This meant extra properties (including PII like `email`, `user_id`) could be forwarded unfiltered to PostHog for spec events, even though passthrough events had PDPA filtering.

**Root cause:**
Two separate concerns were conflated: "validate required fields present" (what the model_validator did) vs "only allow spec-defined fields" (what was needed for PDPA compliance). The passthrough path had explicit PDPA filtering but the spec event path did not.

**Fix:**
Define per-event typed Pydantic property models (`SearchSubmittedProperties`, `CheckinCompletedProperties`, etc.) and replace `self.properties` with `validated.model_dump(exclude_none=True)`. This is an **allowlist** approach — only declared fields survive validation.

**Prevention rule:**
When an event/request model must enforce a field whitelist (e.g. for PDPA, for schema stability), use a typed Pydantic model and replace the raw dict with `model.model_dump()`. Do NOT rely on a blocklist to exclude bad fields — new PII fields can be added in future without updating the blocklist. An allowlist is closed by default; a blocklist is open by default.

Secondary benefit: `model_validate()` per event also fixes property type validation (a `result_count` field gets validated as `int`, not `Any`), UUID validation (via `@field_validator`), and `None` handling in one place.
