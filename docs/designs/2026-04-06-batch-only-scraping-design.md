# Consolidate Scraping to Batch-Only — Design

**Ticket:** [DEV-276](https://linear.app/ytchou/issue/DEV-276)
**Date:** 2026-04-06
**Status:** Approved

## Problem

CafeRoam's scraping pipeline has three paths with different cost profiles:

| Path                  | Trigger               | Cost                                     |
| --------------------- | --------------------- | ---------------------------------------- |
| `scrape_by_url`       | Per user submission   | 1 Apify run each — expensive, unbounded  |
| `scrape_batch`        | Manual batch script   | 1 Apify run for N shops — cost-efficient |
| `scrape_reviews_only` | Daily staleness sweep | Apify + Claude spend for marginal value  |

Google reviews are only used as Claude enrichment input and are never shown to users. The staleness sweep triggers unnecessary spend. Single-shop scrapes make costs unpredictable.

## Solution

Consolidate to batch-only:

1. **Remove single-shop path** — user submissions create a `pending` shop and return. No immediate scrape.
2. **Remove staleness sweep** — delete the daily review-check cron and `scrape_reviews_only` provider method.
3. **Add daily batch cron** — at 03:10 Asia/Taipei, query all pending shops and enqueue a single `SCRAPE_BATCH` job.
4. **Admin re-scrape via batch** — admin `enqueue_job` routes through `SCRAPE_BATCH` with a single-shop payload.

## Architecture

### Before

```
User submission → SCRAPE_SHOP (immediate, 1 Apify run)
Staleness sweep → scrape_reviews_only → SCRAPE_SHOP (conditional)
Admin panel → SCRAPE_SHOP (manual trigger)
Batch script → scrape_batch (manual, N shops)
```

### After

```
User submission → pending shop row (no job enqueued)
Daily cron (03:10) → SCRAPE_BATCH (all pending shops)
Admin panel → SCRAPE_BATCH (single-shop payload)
Batch script → scrape_batch (all pending shops)
```

## Key Design Decisions

### Batch scope: all pending shops

Both the daily cron and `run_pipeline_batch.py` process ALL pending shops regardless of source (user submission, CSV import, admin). One concept of "pending" everywhere.

### Submission flow stores google_maps_url on shop row

Currently `submissions.py` only passes the URL through the SCRAPE_SHOP job payload. With batch-only, the cron queries the `shops` table, so `google_maps_url` must be stored on the shop row at submission time. The `shop_submissions.shop_id` is also linked immediately.

### Admin re-scrape via SCRAPE_BATCH

Admin `enqueue_job` accepts `SCRAPE_BATCH` instead of `SCRAPE_SHOP`. Builds a single-shop batch payload: `{batch_id, shops: [{shop_id, google_maps_url}]}`. This reuses the existing batch handler with no special-casing.

### Cron schedule: 03:10 Asia/Taipei

Avoids collision with other 3am crons (delete_expired_accounts at 3:02, reembed_reviewed_shops at 3:01).

## Files Changed

### Deleted

- `backend/workers/handlers/scrape_shop.py`
- `backend/workers/handlers/staleness_sweep.py`
- `backend/tests/workers/test_scrape_shop_handler.py`
- `backend/tests/workers/test_smart_staleness.py`

### Modified

- `backend/api/submissions.py` — store URL, link submission, remove enqueue, update response copy
- `backend/workers/scheduler.py` — add daily_batch_scrape cron, remove old dispatch/cron
- `backend/api/admin_shops.py` — SCRAPE_BATCH routing for admin re-scrape
- `backend/models/types.py` — remove SCRAPE_SHOP + STALENESS_SWEEP from JobType
- `backend/providers/scraper/interface.py` — remove scrape_by_url + scrape_reviews_only
- `backend/providers/scraper/apify_adapter.py` — remove scrape_by_url + scrape_reviews_only
- `backend/api/admin.py` — simplify batch listing to SCRAPE_BATCH only
- `backend/scripts/run_pipeline_batch.py` — remove --count/--seed, process all pending
- `backend/scripts/run_csv_import.py` — docstring update

### Created

- `backend/tests/workers/test_daily_batch_scrape.py`

## Alternatives Rejected

1. **Keep SCRAPE_SHOP for admin only** — preserves manual refresh but contradicts consolidation goal, adds complexity for a rare use case.
2. **Remove admin re-scrape entirely** — too restrictive; admins occasionally need to force-refresh individual shops.

## Testing Classification

- **New e2e journey?** No — submission flow already exists; only backend processing timing changes.
- **Coverage gate impact?** No — scraper pipeline is infrastructure, not a critical-path service.

## SPEC/PRD Updates Needed

- SPEC.md §2: Remove staleness sweep, document batch-only pipeline
- SPEC.md §9: Add "submissions processed in daily batch, up to 24h"
- PRD.md: Update community submissions with batch processing note
