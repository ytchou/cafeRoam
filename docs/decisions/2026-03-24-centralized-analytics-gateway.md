# ADR: Centralized analytics gateway endpoint

Date: 2026-03-24

## Decision

All analytics events (both the 7 spec events and ad-hoc frontend events) are routed through a single `POST /analytics/events` backend endpoint rather than firing from individual API endpoints or directly from the client.

## Context

DEV-16 requires wiring all 7 instrumented events through PostHog with correct properties and PDPA-compliant anonymized user IDs. The existing pattern (DEV-9) fires `search_submitted` inline within `GET /search`. Other events fire client-side via `posthog.capture()`. This created duplicates, inconsistent `distinct_id` values, and no central PDPA enforcement.

## Alternatives Considered

- **Fire from each data endpoint** (DEV-9 pattern): Analytics calls live alongside business logic in `GET /search`, `GET /shops/{id}`, etc. Rejected: couples analytics schema changes to data endpoints, creates side effects in GET requests, and doesn't scale — every new event means modifying an unrelated endpoint.

- **Client-side only via `posthog-js`**: All events fire from the frontend directly to PostHog. Rejected: can't enforce PDPA server-side, can't do DB lookups for server-enriched properties (`is_first_checkin_at_shop`), and client-computed `distinct_id` risks PII leakage.

## Rationale

A single gateway endpoint centralizes three concerns that were previously scattered: (1) PDPA-compliant user ID anonymization, (2) typed schema validation for critical events, and (3) a single ingestion path that eliminates duplicates. The hybrid validation strategy (strict for 7 spec events, permissive passthrough for others) balances safety with iteration speed.

## Consequences

- Advantage: Single place for PDPA compliance, typed event schemas, no duplicate events
- Advantage: Frontend devs can ship new tracking without backend schema changes (passthrough path)
- Advantage: `GET /search` becomes a pure data endpoint (analytics side effect removed)
- Disadvantage: Every frontend event now requires a backend round-trip (acceptable at current scale)
- Disadvantage: `search_submitted` requires frontend to read `query_type` from search response and fire a second call
