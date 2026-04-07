# Design: DEV-289 — `timed_out` Pipeline Status with Hourly Cron Sweep

**Date:** 2026-04-07
**Status:** Approved
**Ticket:** [DEV-289](https://linear.app/ytchou/issue/DEV-289)

## Problem

Shops that get stuck in active pipeline states (`pending`, `pending_url_check`, `scraping`, `enriching`, `embedding`, `publishing`) are currently invisible — there's no way to distinguish "still processing" from "broken". The admin dashboard shows 473 queued and 5 scraping shops with no visibility into which are stuck.

## Solution

Add a `timed_out` status to the `processing_status` enum. An hourly cron sweep marks shops that have been in any non-terminal active state for 3+ days as `timed_out`. The admin dashboard surfaces these with an amber badge.

## Architecture

### Components

1. **DB migration** — Add `timed_out` to `shops_processing_status_check` constraint
2. **Backend enum** — Add `TIMED_OUT` to `ProcessingStatus(StrEnum)`
3. **Hourly cron lock** — Add `hour` window to `JobQueue.acquire_cron_lock()`
4. **Sweep cron job** — `run_sweep_timed_out()` using `@idempotent_cron("sweep_timed_out", window="hour")`
5. **Frontend constants** — Add `timed_out` to `STATUS_OPTIONS`, `STATUS_LABELS`, `STATUS_COLORS`

### Data Flow

```
APScheduler (every hour at :30)
  → run_sweep_timed_out()
    → idempotent_cron lock check (hourly)
    → UPDATE shops SET processing_status = 'timed_out'
        WHERE processing_status IN (active_statuses)
        AND updated_at < now() - interval '3 days'
    → Log count of affected rows
```

### Sweep Scope

**Active (non-terminal) statuses swept:**

- `pending`, `pending_url_check`, `scraping`, `enriching`, `embedding`, `publishing`

**Terminal statuses excluded:**

- `live`, `failed`, `rejected`, `out_of_region`, `filtered_dead_url`, `timed_out`, `pending_review`

### Queue Guard

`timed_out` shops are naturally excluded from the daily batch scrape (which filters `eq("processing_status", "pending")`). Recovery is admin-only via:

- CSV re-import (DEV-290)
- Retry button (DEV-291)

### No Changes Needed

- `backend/api/admin_shops.py` — `pipeline_status()` auto-discovers all statuses from DB
- `app/(admin)/admin/shops/page.tsx` — iterates `STATUS_COLORS` keys dynamically
- `app/api/admin/shops/pipeline-status/route.ts` — passthrough proxy

## Error Handling

- `idempotent_cron` prevents double-firing within the same hour
- Failed UPDATE is logged + captured by Sentry (existing decorator behavior)
- No user-facing impact — admin-only infrastructure

## Testing Strategy

- Unit: sweep function targets correct statuses + 3-day threshold
- Unit: `acquire_cron_lock` with `window="hour"` window truncation
- Integration: pipeline-status endpoint returns `timed_out` count

## Testing Classification

- [ ] New e2e journey? No — admin-only cron, no new critical user path
- [ ] Coverage gate impact? No — ops infrastructure, not a critical-path service

## Alternatives Rejected

- **Postgres function:** Adds migration complexity + split logic for no meaningful performance gain at current scale
- **Sweep only 3 states (queued, scraping, pending_url_check):** Leaves enriching/embedding/publishing as blind spots
- **Auto-retry timed_out shops:** Risks infinite timeout loops; admin-only recovery is safer
