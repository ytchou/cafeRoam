# Admin Import Triggers — Design

**Date:** 2026-03-02
**Status:** Implemented
**PR:** follows #15 (admin dashboard)

## Problem

Both importers (`cafe_nomad.py`, `google_takeout.py`) existed as standalone functions with no API endpoints or admin UI wiring. Admins had no way to trigger imports, review candidate shops, or control when expensive Apify scraping began.

## Solution

Four new backend routes + frontend UI with a two-phase flow: **import → pre-filter → admin review → scraping**.

## Architecture

```
Admin selects region → triggers import (Cafe Nomad or Google Takeout)
  → Synchronous: parse + pre-filter steps 1-4,6 → shops inserted as pending_url_check
  → 202 response with summary

Admin clicks "Check URLs"
  → Background: HTTP HEAD on each shop URL (5 concurrent, 1s batch delay)
  → Pass → pending_review | Fail → filtered_dead_url

Admin filters by pending_review → reviews shops + flagged duplicates
  → Bulk-approves (max 50/batch)
  → Approved shops → pending → SCRAPE_SHOP queued → Apify pipeline
```

## Processing Status Flow

```
pending_url_check → (background URL check) → pending_review → (admin approve) → pending → scraping → enriching → embedding → publishing
                                                                                                                                ↘ failed
                  → filtered_dead_url (terminal)
```

## Components

### Shared Region Config (`backend/core/regions.py`)

Frozen dataclasses `GeoBounds` and `Region`, a `REGIONS` dict, and `DEFAULT_REGION`. Adding a new city = one dict entry. Both importers and the admin UI pick it up automatically.

### Pre-Filter Pipeline (`backend/importers/prefilter.py`)

Six steps, all free (no Apify cost):

| Step | What | Result | When |
|---|---|---|---|
| 1. URL validation | Regex for Google Maps URL | Auto-reject | Synchronous |
| 2. Fuzzy dedup | `SequenceMatcher` similarity > 0.8 + coords within ~200m | Flag for review | Synchronous |
| 3. Known-failed check | DB lookup for failed shops at same coords | Auto-reject | Synchronous |
| 4. Name validation | Rejects control chars, pure numbers/symbols, single char | Auto-reject | Synchronous |
| 5. HTTP HEAD | Checks URL resolves (200 vs 404) | Auto-reject | **Background batch** |
| 6. Cafe Nomad closed | Filters `closed: true` | Auto-reject | Synchronous |

Step 5 runs as a background batch (not during synchronous import) to avoid Google rate-limiting and gateway timeouts on bulk HEAD requests. Concurrency: `asyncio.Semaphore(5)`, 1s delay between batches.

**Dependency choice:** `difflib.SequenceMatcher` (stdlib) over `python-Levenshtein` (C-extension) — adequate at current scale (~500 imports × ~1000 DB shops is sub-second). Migrate to `pg_trgm` + GIN index when dataset exceeds ~5000 shops.

### Backend Routes

- `POST /admin/shops/import/cafe-nomad` — region param, returns 202 + summary
- `POST /admin/shops/import/google-takeout` — multipart file upload (10MB limit), region form field
- `POST /admin/shops/bulk-approve` — max 50 shops/batch, staggered priority, transitions `pending_review → pending`
- `POST /admin/shops/import/check-urls` — fires background `check_urls_for_region` via FastAPI `BackgroundTasks`

Import response shape:
```json
{
  "imported": 380,
  "filtered": { "invalid_url": 12, "invalid_name": 5, "known_failed": 8, "closed": 15 },
  "pending_url_check": 380,
  "flagged_duplicates": 57,
  "region": "greater_taipei"
}
```

### Frontend

- Custom multipart proxy for Google Takeout (`app/api/admin/shops/import/google-takeout/route.ts`) — cannot use `proxyToBackend` which hardcodes `Content-Type: application/json`; reads body as `ArrayBuffer`, forwards original `Content-Type` (with multipart boundary)
- Admin shops page: region dropdown, import buttons, Check URLs button, bulk approve bar (shown for `pending_review` filter), checkbox selection

## Files

| File | Action |
|---|---|
| `backend/core/regions.py` | New — shared region config |
| `backend/importers/prefilter.py` | New — pre-filter pipeline |
| `backend/importers/cafe_nomad.py` | Updated — accepts `Region`, dynamic URL, pre-filter |
| `backend/importers/google_takeout.py` | Updated — accepts `GeoBounds`, pre-filter |
| `backend/models/types.py` | Added `PENDING_URL_CHECK`, `PENDING_REVIEW`, `FILTERED_DEAD_URL` |
| `backend/api/admin_shops.py` | Added 4 routes |
| `backend/workers/handlers/check_urls.py` | New — background URL validation worker |
| `app/api/admin/shops/import/cafe-nomad/route.ts` | New — proxy |
| `app/api/admin/shops/import/google-takeout/route.ts` | New — custom multipart proxy |
| `app/api/admin/shops/bulk-approve/route.ts` | New — proxy |
| `app/api/admin/shops/import/check-urls/route.ts` | New — proxy |
| `app/(admin)/admin/shops/page.tsx` | Updated — import UI, bulk approve |

## ADR: Region Config as Code vs DB

Chose Python dict over a DB table. Simpler, no migration needed. Adding a city is a deliberate code change — new city launch is an intentional product decision, not admin self-service.
