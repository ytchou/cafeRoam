# Design: Search Observability (DEV-9)

Date: 2026-03-24

## Goal

Understand what users search for and where search fails, so we can prioritize embedding, taxonomy, and menu search improvements (DEV-6, DEV-7). Without query logs we're flying blind.

## Decisions

- **Storage:** Both Postgres table (queryable analytics) + PostHog event (real-time dashboards)
- **Query classification:** Keyword heuristic (fast, free, tunable with real data)
- **Analytics API:** None — query via SQL/Supabase dashboard for now
- **Logging mode:** Fire-and-forget async — never adds latency to search responses

## Architecture

Two complementary logging channels, both fire-and-forget from the search API endpoint:

1. **`search_events` Postgres table** — persistent, queryable via SQL. Enables cross-joins with `shops` and `taxonomy_tags` to identify coverage gaps.
2. **`search_submitted` PostHog event** — real-time dashboards and alerting. Completes the spec-defined event with server-side `query_type` classification.

Both are written from the search API endpoint (`backend/api/search.py`), not the service layer. The service returns results; the endpoint handles instrumentation.

## Components

### 1. Database migration — `search_events` table

```sql
CREATE TABLE search_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_anon  TEXT NOT NULL,
  query_text    TEXT NOT NULL,
  query_type    TEXT NOT NULL,  -- 'item_specific' | 'specialty_coffee' | 'generic'
  mode_filter   TEXT,           -- 'work' | 'rest' | 'social' | NULL
  result_count  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_events_created_at ON search_events (created_at);
CREATE INDEX idx_search_events_zero_results ON search_events (result_count) WHERE result_count = 0;
CREATE INDEX idx_search_events_query_type ON search_events (query_type);
```

No RLS — internal analytics table, not user-facing.

### 2. Query type classifier — keyword heuristic

New module: `backend/services/query_classifier.py`

- Compiled regex at module level (per performance standards)
- Three categories:
  - `item_specific` — food/drink terms (巴斯克蛋糕, 司康, 拿鐵, 手沖, etc.)
  - `specialty_coffee` — coffee method/origin terms (單品, 淺焙, 衣索比亞, etc.)
  - `generic` — everything else
- Pure function, no side effects

### 3. Search endpoint changes — `backend/api/search.py`

After calling `service.search()` and before returning results:

1. Classify query via `query_classifier.classify(text)`
2. Anonymize user ID (one-way hash with server-side salt)
3. Fire two async tasks (fire-and-forget):
   - INSERT into `search_events` table
   - `analytics_provider.track("search_submitted", {...}, distinct_id=user_id_anon)`

### 4. PostHog adapter update

Update `PostHogAnalyticsAdapter.track()` to accept an optional `distinct_id` parameter instead of hardcoding `"server"`. Establishes the pattern DEV-16 will follow for all 7 spec events.

## Data Flow

```
User query → search endpoint
  → SearchService.search() → results
  → classify(query_text) → query_type
  → anonymize(user_id) → user_id_anon
  → asyncio.create_task:
      ├── INSERT search_events (user_id_anon, query_text, query_type, mode, result_count)
      └── analytics.track("search_submitted", {...}, distinct_id=user_id_anon)
  → return results (no latency added)
```

## Error Handling

- Logging failures caught and logged via `structlog` — never surface to the user
- PostHog unreachable → event silently dropped (SDK handles internally)
- DB INSERT failure → log warning, continue

## Testing Strategy

- **Unit test:** `query_classifier.classify()` — pure function, test all categories + edge cases (mixed language, empty strings)
- **Integration test:** Search endpoint fires both logging channels — mock DB insert and analytics provider at boundaries, verify correct properties
- **No E2E** — internal instrumentation, not user-facing

## PDPA Compliance

- `user_id_anon` = one-way hash of user ID with server-side salt (not reversible)
- `query_text` is logged (acceptable per spec — search input, not PII)
- No email, name, or raw user ID in any event

## Related

- **DEV-16** (blocked by this): Audit all 7 spec events for proper server-side + PostHog coverage
- **DEV-6/7:** Search logs will inform which improvement (menu search vs. review indexing) to prioritize
- **Spec:** `SPEC.md §6 Observability`, `docs/designs/ux/metrics.md`
