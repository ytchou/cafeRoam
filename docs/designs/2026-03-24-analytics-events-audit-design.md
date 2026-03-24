# Analytics Events Audit — Design (DEV-16)

> Date: 2026-03-24
> Status: Approved
> Ticket: DEV-16

## Goal

Ensure all 7 instrumented events defined in `docs/designs/ux/metrics.md` are wired through both the server-side analytics provider (PostHog) and captured with correct properties. Introduce a centralized analytics gateway endpoint to replace scattered event firing.

## Current State

| Event                   | Frontend                                       | Backend (PostHog)                     | Properties Match Spec?                                                         |
| ----------------------- | ---------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `search_submitted`      | `search-bar.tsx` + `search/page.tsx` (partial) | `backend/api/search.py` (full, DEV-9) | Backend yes; frontend missing `query_type`, `mode_chip_active`, `result_count` |
| `shop_detail_viewed`    | `shop-detail-client.tsx`                       | Not implemented                       | Missing `session_search_query`                                                 |
| `shop_url_copied`       | `share-button.tsx` + `share-popover.tsx`       | N/A (frontend-only OK)                | Yes                                                                            |
| `checkin_completed`     | `checkin/[shopId]/page.tsx`                    | Not implemented                       | Frontend has all props but needs server-side                                   |
| `profile_stamps_viewed` | `profile/page.tsx`                             | N/A (frontend-only OK)                | Yes                                                                            |
| `filter_applied`        | `filter-sheet.tsx`                             | N/A (frontend-only OK)                | Yes                                                                            |
| `session_start`         | `session-tracker.tsx`                          | Not implemented                       | Needs server-side for `previous_sessions`                                      |

Additional issues:

- `search_submitted` fires both client (partial) and server (full) — creates duplicates
- No consistent pattern for which events fire server-side vs. client-side
- ~10 non-spec events fire client-side only (tarot, community, etc.)

## Architecture

### Centralized Analytics Gateway

A new `POST /analytics/events` endpoint becomes the single server-side ingestion point for all analytics events.

```
Frontend ──POST /api/analytics/events──▶ Next.js proxy ──▶ Backend POST /analytics/events
                                                                │
                                                          Validates schema (strict 7)
                                                          or PDPA filter (passthrough)
                                                          + anonymizes user ID
                                                                │
                                                          AnalyticsProvider.track() (PostHog)
```

**Why a gateway over scattered endpoint calls:**

- Single place for PDPA compliance (anonymized user IDs)
- No duplicate events (client fires once → backend, not both)
- Typed schemas for the 7 critical events
- Non-spec events can pass through without schema changes

### Validation Strategy: Hybrid

- **Strict path (7 spec events):** Pydantic discriminated union validates required properties per event type. Server enriches with anonymized `distinct_id`.
- **Passthrough path (other events):** PDPA blocklist filter strips forbidden fields (`email`, `phone`, `user_id`, `name`). Tags with `source: "client"` property.

## Components

### 1. Backend: Analytics Events Endpoint

**File:** `backend/api/analytics.py` (new)

- Auth-required (extracts user from JWT for anonymization)
- Accepts: `{ "event": string, "properties": { ... } }`
- Routes to strict validation or passthrough based on event name
- Fires via `AnalyticsProvider.track()` in `BackgroundTasks` (fire-and-forget)
- Anonymizes user ID via `core/anonymize.py`

### 2. Backend: Event Models

**File:** `backend/models/analytics_events.py` (new)

Pydantic models for each spec event:

| Event                   | Server-enriched                                             | Client-provided                                  |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `search_submitted`      | `query_type` (classifier)                                   | `query_text`, `mode_chip_active`, `result_count` |
| `shop_detail_viewed`    | —                                                           | `shop_id`, `referrer`, `session_search_query`    |
| `shop_url_copied`       | —                                                           | `shop_id`, `copy_method`                         |
| `checkin_completed`     | `is_first_checkin_at_shop` (DB lookup)                      | `shop_id`, `has_text_note`, `has_menu_photo`     |
| `profile_stamps_viewed` | —                                                           | `stamp_count`                                    |
| `filter_applied`        | —                                                           | `filter_type`, `filter_value`                    |
| `session_start`         | `days_since_first_session`, `previous_sessions` (heartbeat) | —                                                |

**Server-enriched events:**

- `checkin_completed`: Endpoint does DB lookup to resolve `is_first_checkin_at_shop` server-side (don't trust client value)
- `session_start`: Endpoint calls `ProfileService.session_heartbeat()` internally to get `days_since_first_session` and `previous_sessions`
- `search_submitted`: Frontend sends `query_type` from search response (server-computed by classifier in `GET /search`)

### 3. Search Endpoint Migration

**File:** `backend/api/search.py` (modify)

- Remove `_track_search_analytics()` call from `GET /search`
- Add `query_type` and `result_count` to search response JSON
- Frontend reads these from response and sends to `/analytics/events`

### 4. Frontend: `useAnalytics` Hook

**File:** `lib/posthog/use-analytics.ts` (modify)

Change `capture()` to POST to `/api/analytics/events` instead of `posthog.capture()` directly.

- All events (spec + non-spec) route through the backend
- Remove direct `posthog-js` event capture from the hook
- `posthog-js` still initializes for autocapture/session recording if enabled

### 5. Frontend: Event Call Site Updates

| File                     | Change                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `search-bar.tsx`         | Remove `capture('search_submitted', ...)` (was partial)          |
| `search/page.tsx`        | Fire `search_submitted` with full props from search response     |
| `shop-detail-client.tsx` | Add `session_search_query` from URL `?q=` param                  |
| `session-tracker.tsx`    | Keep heartbeat call; `session_start` routes through updated hook |
| All other call sites     | No change needed — hook migration handles routing                |

### 6. Shop URL Query Params

When a user taps a search result, the shop link includes `?ref=search&q=<query>`. The shop detail page reads these and passes them to the `shop_detail_viewed` event.

### 7. Next.js API Proxy Route

**File:** `app/api/analytics/events/route.ts` (new)

Thin proxy to `POST /analytics/events`. No business logic.

### 8. PDPA Compliance

- All events get `distinct_id` set server-side via `anonymize_user_id(user_id, salt=settings.posthog_salt)`
- Passthrough events get PDPA blocklist filter
- No raw user IDs, emails, or phone numbers ever reach PostHog

## Testing Strategy

**Backend:**

- Pydantic model validation for all 7 events (happy + missing fields)
- Integration: `POST /analytics/events` → verify `AnalyticsProvider.track()` called with correct args
- PDPA: passthrough event with PII → verify stripped
- Search response includes `query_type` and `result_count`

**Frontend:**

- `useAnalytics.capture()` → POSTs to `/api/analytics/events`
- Existing component tests updated where event properties change

## Out of Scope

- PostHog dashboard / funnel configuration
- `page()` method `distinct_id` fix
- Migrating PostHog autocapture/session recording config
- Deduplication logic in PostHog (not needed with single ingestion path)
