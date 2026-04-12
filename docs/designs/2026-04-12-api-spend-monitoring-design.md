---
# API Spend Monitoring — Design Doc

**Date:** 2026-04-12
**Ticket:** [DEV-317](https://linear.app/ytchou/issue/DEV-317/add-daily-api-spend-monitoring-tab-to-admin-dashboard)

## Goal

Give operators a live view of daily API spend across all three external providers (Claude/Anthropic, OpenAI, Apify) so cost spikes can be caught early and enrichment costs stay within budget.

## Architecture

```
Provider Adapters → api_usage_log (Supabase) → /admin/pipeline/spend → SpendTab
```

Every external provider call logs one row to `api_usage_log`. The admin endpoint aggregates today/MTD totals per provider and task. The SpendTab component renders a collapsible provider → task table.

## Components

### DB: `api_usage_log` table
One row per external API call. Fields: `provider`, `task`, `model`, `tokens_input`, `tokens_output`, `tokens_cache_write`, `tokens_cache_read` (Anthropic cache tokens), `compute_units` (Apify), `cost_usd` (LLM only — null for Apify), `created_at`. Indexed on `created_at` and `(provider, task)`. RLS enabled; service role only.

### `backend/providers/cost.py` *(new)*
Pricing constants per LLM model (per 1M tokens, input/output/cache_write/cache_read).
`compute_llm_cost(model, tokens_input, tokens_output, cache_write=0, cache_read=0) -> float`.
Unknown models return 0.0 (cost logged as zero rather than erroring).

### `backend/providers/api_usage_logger.py` *(new)*
`log_api_usage(**kwargs) -> None`. Inserts one row via service-role Supabase client.
Wrapped in try/except — logging failure must never interrupt enrichment.

### Adapter instrumentation

**Anthropic** (`anthropic_adapter.py`): After each `messages.create()` call, extract
`response.usage.input_tokens`, `response.usage.output_tokens`,
`response.usage.cache_creation_input_tokens`, `response.usage.cache_read_input_tokens`.
Compute cost via `compute_llm_cost`. Call `log_api_usage`.

**OpenAI** (`openai_adapter.py` + embedding call sites): After each `chat.completions.create()`
call, extract `response.usage.prompt_tokens`, `response.usage.completion_tokens`.
After each embedding call, extract token count. Call `log_api_usage`.

**Apify** (`apify_adapter.py`): After `actor.call()` returns the run dict,
extract `run.get('stats', {}).get('computeUnits', 0.0)`. Call
`log_api_usage(provider='apify', task='scrape_batch', compute_units=cu)`.

### `GET /admin/pipeline/spend` *(new endpoint in `backend/api/admin.py`)*
Queries current-month rows from `api_usage_log`. Aggregates in Python by provider/task.
Apify cost computed as `compute_units * settings.apify_cost_per_cu`.
Returns structured JSON (see response schema below).

### SpendTab *(new component)*
`app/(admin)/admin/_components/SpendTab.tsx`. Props: `{ getToken: () => Promise<string | null> }`.
Manual fetch on mount + refresh button. No polling. Provider-level summary rows with collapsible
task sub-rows. Same fetch + useState/useCallback pattern as existing admin tab components.

### `app/api/admin/pipeline/spend/route.ts` *(new Next.js proxy)*
One-line proxy following the established pattern for all admin pipeline routes.

## Data Flow

```
enrichment pipeline
  → adapter.enrich_shop()
    → [Anthropic API call]
    → [log_api_usage()] → INSERT INTO api_usage_log

admin page loads
  → SpendTab.useEffect → fetch /api/admin/pipeline/spend
    → Next.js proxy route.ts
      → FastAPI GET /admin/pipeline/spend
        → SELECT * FROM api_usage_log WHERE created_at >= month_start
        → Python aggregation (group by provider, task)
        → JSON response
```

## API Response Schema

```json
{
  "today_total_usd": 1.23,
  "mtd_total_usd": 45.67,
  "providers": [
    {
      "provider": "anthropic",
      "today_usd": 1.20,
      "mtd_usd": 40.00,
      "today_calls": 42,
      "mtd_calls": 1000,
      "tasks": [
        {
          "task": "enrich_shop",
          "today_usd": 1.10,
          "mtd_usd": 38.50,
          "today_calls": 35,
          "mtd_calls": 850,
          "today_tokens_in": 12000,
          "today_tokens_out": 5000,
          "mtd_tokens_in": 0,
          "mtd_tokens_out": 0
        }
      ]
    }
  ]
}
```

## Design Decisions

### DB-only (no external billing APIs)
**Rejected alternative:** Fan out to Anthropic `/v1/usage`, OpenAI `/dashboard/billing/usage`,
Apify `/v2/users/me/usage/monthly` for provider-level totals.
**Why rejected:** Each provider requires a separate billing-read API key scope (different per
provider), adds external rate-limit risk, and offers no accuracy advantage once adapters are
instrumented. DB-only gives richer task-level data with no additional auth surface.

### Asymmetric cost computation
LLM cost computed at **log time** (tokens × model pricing constant → stored as `cost_usd`).
Apify cost computed at **query time** (`compute_units × apify_cost_per_cu` config setting).
**Rationale:** LLM pricing is deterministic per model/token. Apify pricing may change;
keeping raw compute units allows historical recalculation without re-scraping.

### No caching on /spend endpoint
Admin endpoint queries own DB (fast aggregation, no rate limits). No TTL cache needed.

## Error Handling

- `log_api_usage` swallows all exceptions with `logger.warning`. Enrichment is never interrupted.
- Only successful API calls are logged (logging runs after successful response, not in except blocks).
- Empty `api_usage_log` → endpoint returns `{"today_total_usd": 0, "mtd_total_usd": 0, "providers": []}`.
- SpendTab shows error state on HTTP error or network failure.

## Security

No user PII in `api_usage_log`. Provider/task/token counts/cost only.
RLS enabled on table; `no_public_access` policy denies anon/authenticated reads.
Service role bypasses RLS for writes (adapter logging) and admin reads (endpoint).

## Testing Strategy

**Backend:**
- Unit `test_cost.py`: pricing math for known models, unknown model → 0.0, cache token pricing
- Integration `test_api_usage_logger.py`: mock DB, verify insert shape, verify no-raise on error
- Adapter `test_*_adapter.py`: assert `log_api_usage` fires (via DB mock) with correct fields
- Integration `test_admin_spend.py`: mock DB with sample rows, verify aggregated totals including
  Apify CU→USD; non-admin → 403; empty table → zeros

**Frontend:**
- Unit `SpendTab.test.tsx`: renders totals, loading state, empty state, error state

## Testing Classification

- [ ] No new e2e journey — admin-only feature, no new critical user path
- [ ] No critical-path service touched — search/checkin/lists/auth unaffected
- [ ] No e2e drift risk — new tab added, no existing routes/aria-labels/selectors renamed
