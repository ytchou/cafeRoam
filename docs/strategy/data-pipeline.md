# CafeRoam Data Pipeline

> Complete reference for the shop data pipeline: ingestion, enrichment, embedding, and publication.
>
> Last updated: 2026-04-04

---

## TL;DR

Shops enter through 4 sources, pass through a scrape-enrich-embed pipeline, and go live. The entire pipeline is queue-driven with automatic retries and admin controls at key gates.

### How a Shop Gets Added

| Step | What happens | Status after |
|---|---|---|
| 1. Ingest | Shop enters via import, manual creation, or user submission | `pending_url_check` or `pending` |
| 2. URL Check | HTTP HEAD validates the Google Maps URL is alive | `pending_review` or `filtered_dead_url` |
| 3. Admin Review | Admin approves shop for scraping (bulk or individual) | `pending` --> `scraping` |
| 4. Scrape | Apify fetches Google Maps data (name, address, reviews, photos, hours, etc.) | `enriching` |
| 5. Enrich | Claude LLM generates summary, tags, mode scores, menu highlights | `embedding` |
| 6. Embed | OpenAI creates 1536-dim vector from description + menu + community text | `publishing` |
| 7. Publish | Auto-publish (admin sources) or route to review (user submissions) | `live` or `pending_review` |

User submissions have an extra review gate: they go `publishing --> pending_review --> live` (admin must approve).

### Pipeline at a Glance

| Stage | Provider | Model / Actor | Input | Output |
|---|---|---|---|---|
| Scrape | Apify | `compass/crawler-google-places` | Google Maps URL | Name, address, coords, reviews, photos, hours, phone, website, rating |
| Enrich | Anthropic | `claude-sonnet-4-6` | Shop metadata + reviews | Summary (zh-TW), tags, mode scores, menu highlights, coffee origins |
| Tarot | Anthropic | `claude-sonnet-4-6` | Shop metadata + reviews | Tarot title + flavor text |
| Classify photos | Anthropic | `claude-haiku-4-5` | Photo thumbnails | MENU / VIBE / SKIP per photo |
| Summarize check-ins | Anthropic | `claude-haiku-4-5` | User check-in texts | Community snapshot (zh-TW, max 200 chars) |
| Embed | OpenAI | `text-embedding-3-small` | Description + menu + community | 1536-dim vector |

### Ingestion Sources

| Source | Endpoint | Trigger | Volume | Initial status |
|---|---|---|---|---|
| Cafe Nomad | `POST /admin/shops/import/cafe-nomad` | Admin | Bulk (region) | `pending_url_check` |
| Google Takeout | `POST /admin/shops/import/google-takeout` | Admin | Bulk (file upload) | `pending_url_check` |
| Manual creation | `POST /admin/shops` | Admin | Single | `pending` |
| User submission | `POST /submissions` | Public | Single (rate-limited) | `pending` |

### Queue System Summary

| Property | Value |
|---|---|
| Storage | Supabase `job_queue` table |
| Claim | Atomic `FOR UPDATE SKIP LOCKED` via RPC |
| Priority | Integer, higher = processed first |
| Retries | 3 attempts, exponential backoff (60s / 120s / 240s) |
| Stuck detection | Jobs claimed > 10 min are reclaimed |
| Polling | Every 5 minutes |

| Job type | Concurrency | Priority (typical) |
|---|---|---|
| `SCRAPE_SHOP` / `SCRAPE_BATCH` | 1 | -- |
| `ENRICH_SHOP` | 3 | 5 |
| `GENERATE_EMBEDDING` | 20 | 5 (pipeline) / 2 (re-embed) |
| `PUBLISH_SHOP` | 20 | 5 |
| `CLASSIFY_SHOP_PHOTOS` | 1 | 2 |
| `SUMMARIZE_REVIEWS` | 1 | 2 |
| All others | 1 | -- |

---

## Pipeline Overview (Detailed)

```
Source (import/submit)
  --> Pre-filter (name, dedup, geo)
    --> URL Check (HTTP HEAD)
      --> Admin Review (pending_review)
        --> SCRAPE (Apify Google Maps)
          --> PERSIST (geo-gate, store reviews/photos)
            --> ENRICH_SHOP (Claude LLM)
              --> GENERATE_EMBEDDING (OpenAI)
                --> PUBLISH_SHOP (auto or review gate)
                  --> LIVE

Side jobs (parallel to main pipeline):
  PERSIST --> CLASSIFY_SHOP_PHOTOS (Claude Haiku vision)
  Menu photo upload --> ENRICH_MENU_PHOTO (Claude Sonnet vision)

Maintenance (daily cron):
  STALENESS_SWEEP --> SCRAPE_SHOP (if new reviews found)
  REEMBED_REVIEWED_SHOPS --> SUMMARIZE_REVIEWS --> GENERATE_EMBEDDING
```

---

## 1. Ingestion Sources

### Cafe Nomad Import

| | |
|---|---|
| Endpoint | `POST /admin/shops/import/cafe-nomad` |
| Handler | `backend/importers/cafe_nomad.py` |
| Data source | `cafenomad.tw/api/v1.2/cafes` |
| Fields received | `name`, `address`, `latitude`, `longitude`, `website`, `closed` |
| Initial status | `pending_url_check` |

Pre-filters applied:
1. Skip closed shops
2. Geo-bounding box (Taiwan region)
3. Name validation (min 2 chars, no control chars)
4. Fuzzy dedup: >80% name similarity + <200m proximity
5. Known-failed location check
6. Existing `cafenomad_id` dedup

### Google Takeout Import

| | |
|---|---|
| Endpoint | `POST /admin/shops/import/google-takeout` |
| Handler | `backend/importers/google_takeout.py` |
| Formats | GeoJSON (`.json`/`.geojson`) or CSV |
| Initial status | `pending_url_check` |

- GeoJSON provides coordinates; CSV does not (scraper fills them later)
- Same pre-filters as Cafe Nomad + URL pattern validation

### Manual Shop Creation (Admin)

| | |
|---|---|
| Endpoint | `POST /admin/shops` |
| Handler | `backend/api/admin_shops.py` |
| Fields | `name`, `address`, `latitude`, `longitude`, `google_maps_url` |
| Initial status | `pending` |
| Source tag | `"manual"` |

### User Submission (Public)

| | |
|---|---|
| Endpoint | `POST /submissions` |
| Handler | `backend/api/submissions.py` |
| Input | Single Google Maps URL |
| Rate limits | 10/hour global, 5 active/day per user |
| Initial status | `pending` (shop) + `pending` (submission) |

Immediately enqueues `SCRAPE_SHOP` with submission context.

---

## 2. Processing Status Lifecycle

```python
class ProcessingStatus(StrEnum):
    PENDING              = "pending"
    PENDING_URL_CHECK    = "pending_url_check"
    PENDING_REVIEW       = "pending_review"
    SCRAPING             = "scraping"
    ENRICHING            = "enriching"
    EMBEDDING            = "embedding"
    PUBLISHING           = "publishing"
    LIVE                 = "live"
    FAILED               = "failed"
    FILTERED_DEAD_URL    = "filtered_dead_url"
```

### State Transitions

**Import path (Cafe Nomad / Google Takeout):**
```
pending_url_check --> pending_review  (URL check passes)
pending_url_check --> filtered_dead_url  (URL check fails)
pending_review --> scraping  (admin bulk-approve)
```

**Scrape-to-live path:**
```
scraping --> enriching --> embedding --> publishing --> live
```

**User submission path (extra review gate):**
```
pending --> scraping --> enriching --> embedding --> publishing --> pending_review --> live
```

**Re-enrichment (live shops):**
```
live --> (re-embed, stays live) --> live
```

Live shops never lose their `live` status during re-embedding.

---

## 3. Job Queue System

**Implementation:** `backend/workers/queue.py`

| Property | Value |
|---|---|
| Storage | Supabase `job_queue` table |
| Claim mechanism | `FOR UPDATE SKIP LOCKED` via RPC |
| Priority | Higher number = higher priority |
| Max retries | 3 attempts with exponential backoff (60s, 120s, 240s) |
| Stuck timeout | 10 minutes --> reclaim |

### Job Types

```python
class JobType(StrEnum):
    SCRAPE_SHOP            = "scrape_shop"
    SCRAPE_BATCH           = "scrape_batch"
    ENRICH_SHOP            = "enrich_shop"
    GENERATE_EMBEDDING     = "generate_embedding"
    PUBLISH_SHOP           = "publish_shop"
    CLASSIFY_SHOP_PHOTOS   = "classify_shop_photos"
    ENRICH_MENU_PHOTO      = "enrich_menu_photo"
    SUMMARIZE_REVIEWS      = "summarize_reviews"
    REEMBED_REVIEWED_SHOPS = "reembed_reviewed_shops"
    STALENESS_SWEEP        = "staleness_sweep"
    WEEKLY_EMAIL           = "weekly_email"
    ADMIN_DIGEST_EMAIL     = "admin_digest_email"
```

### Concurrency Limits

| Job type | Concurrency | Why |
|---|---|---|
| `SCRAPE_SHOP` / `SCRAPE_BATCH` | 1 | Apify rate limits |
| `ENRICH_SHOP` | 3 | Claude API throughput |
| `GENERATE_EMBEDDING` | 20 | OpenAI batch-friendly |
| `PUBLISH_SHOP` | 20 | DB writes only |
| Everything else | 1 | Default |

**Polling interval:** 5 minutes (configurable via `worker_poll_interval_seconds`)

### Scheduled Cron Jobs

| Job | Schedule | Handler |
|---|---|---|
| Staleness sweep | Daily 3:00 AM | `staleness_sweep.py` |
| Re-embed reviewed shops | Daily 3:01 AM | `reembed_reviewed_shops.py` |
| Delete expired accounts | Daily 3:02 AM | `account_deletion.py` |
| Weekly email digest | Monday 9:00 AM | `weekly_email.py` |

All times in `Asia/Taipei`. Idempotent cron locks prevent double-execution.

---

## 4. Pipeline Handlers (Detail)

### SCRAPE_SHOP / SCRAPE_BATCH

**Files:** `backend/workers/handlers/scrape_shop.py`, `scrape_batch.py`

**What it does:**
1. Sets shop status to `scraping`
2. Calls Apify `compass/crawler-google-places` actor
3. On success: calls `persist_scraped_data()`
4. On failure (shop not found): sets status `failed`

**Apify actor configuration:**
```python
{
    "startUrls": [{"url": google_maps_url}],
    "maxCrawledPlacesPerSearch": 1,
    "maxReviews": 20,
    "maxImages": 10,
    "language": "zh-TW",
    "scrapeReviewerName": False
}
```

**Fields scraped from Google Maps:**

| Field | Stored in | Notes |
|---|---|---|
| `title` | `shops.name` | |
| `address` | `shops.address` | |
| `location.lat/lng` | `shops.latitude/longitude` | |
| `placeId` | `shops.google_place_id` | |
| `totalScore` | `shops.rating` | |
| `reviewsCount` | `shops.review_count` | |
| `openingHours` | `shops.opening_hours` | Normalized to structured format |
| `phone` | `shops.phone` | |
| `website` | `shops.website` | Whatever the business lists on Google Maps |
| `menu` | `shops.menu_url` | Google Maps menu link |
| `price` | `shops.price_range` | |
| `permanentlyClosed` | triggers `failed` status | |
| `countryCode` | geo-gate check | Must be `TW` |
| `categoryName` | `shops.categories` | |
| `reviews[]` | `shop_reviews` table | text, stars, published_at |
| `images[]` | `shop_photos` table | URL + uploaded_at, max 30, <5 years old |

**Fields NOT scraped (gaps):**

| Field | Status | Notes |
|---|---|---|
| `instagram` | Not in DB, not scraped | Google Maps may expose social links but actor response is not checked |
| `facebook` | Not in DB, not scraped | Same |
| `line_url` | Not in DB, not scraped | Not a Google Maps field |
| Social links | Unknown | Apify actor may return them in raw response -- needs investigation |

### PERSIST_SCRAPED_DATA

**File:** `backend/workers/persist.py`

Shared by both scrape handlers. Steps:

1. **Permanently closed check** -- reject if Google says closed
2. **Geo-gate** -- reject if `country_code != "TW"` and address lacks "台灣"
3. **Update shop record** with all scraped fields, set status `enriching`
4. **Replace reviews** -- snapshot old, delete all, insert new (rollback on failure)
5. **Upsert photos** -- dedup on `(shop_id, url)`
6. **Enqueue** `CLASSIFY_SHOP_PHOTOS` (priority 2) and `ENRICH_SHOP` (priority 5)

### ENRICH_SHOP

**File:** `backend/workers/handlers/enrich_shop.py`

**Input to LLM:**
- Shop: name, description, categories, price_range, socket, limited_time, rating, review_count
- All review texts from `shop_reviews`

**LLM provider:** Claude Sonnet (`claude-sonnet-4-6`) via `backend/providers/llm/anthropic_adapter.py`

**Prompt instructs the LLM to:**
- Select tags from a fixed taxonomy (with confidence 0.0-1.0)
- Write a 2-3 sentence Traditional Chinese summary
- Pick 3-5 top review excerpts
- Classify primary mode: work / rest / social / mixed
- Extract menu highlights (max 10) and coffee origins (max 5)

**Fields produced:**

| Field | Stored in |
|---|---|
| Summary | `shops.description` |
| Mode scores | `shops.mode_work`, `shops.mode_rest`, `shops.mode_social` |
| Menu highlights | `shops.menu_highlights` |
| Coffee origins | `shops.coffee_origins` |
| Tags + confidence | `shop_tags` table |
| Enriched timestamp | `shops.enriched_at` |

**Then:** Calls `assign_tarot()` (non-fatal) to set `tarot_title` + `flavor_text`.

**Enqueues:** `GENERATE_EMBEDDING` (priority 5)

### GENERATE_EMBEDDING

**File:** `backend/workers/handlers/generate_embedding.py`

**Embedding text format:**
```
{name}. {description} | {menu_items} || {community_summary}
```

- Menu items: comma-separated from `shop_menu_items`
- Community summary: from `shops.community_summary` or fetched via RPC `get_ranked_checkin_texts` (top 20 check-ins with text >= 15 chars)

**Embedding provider:** OpenAI `text-embedding-3-small` (1536 dimensions)

**Live-shop guard:** If shop is already `live`, only updates the embedding vector without changing status. Prevents shops from temporarily disappearing from search during re-embedding.

**Enqueues:** `PUBLISH_SHOP` (priority 5) -- only if status should advance

### PUBLISH_SHOP

**File:** `backend/workers/handlers/publish_shop.py`

Routes based on source:
- **User submissions:** Sets status to `pending_review` (admin must approve)
- **All other sources:** Sets status to `live` immediately

### CLASSIFY_SHOP_PHOTOS

**File:** `backend/workers/handlers/classify_shop_photos.py`

Runs in parallel with enrichment (priority 2, lower than enrichment's 5).

1. Fetches unclassified photos for the shop
2. Sends each photo (400x225 thumbnail) to Claude Haiku for classification
3. Categories: `MENU`, `VIBE`, or `SKIP`
4. Enforces caps: max 5 MENU + 10 VIBE per shop (excess downgraded to SKIP)
5. Batch-writes categories to `shop_photos`

### ENRICH_MENU_PHOTO

**File:** `backend/workers/handlers/enrich_menu_photo.py`

Triggered when a user uploads a menu photo via check-in.

1. Claude Sonnet extracts structured menu data from the image
2. Replaces `shop_menu_items` for the shop
3. Enqueues `GENERATE_EMBEDDING` (priority 5) so menu items appear in search

### SUMMARIZE_REVIEWS

**File:** `backend/workers/handlers/summarize_reviews.py`

Triggered by the daily `REEMBED_REVIEWED_SHOPS` cron job.

1. Fetches top 20 qualifying check-in texts (>= 15 chars, ranked)
2. Claude Haiku generates a 2-4 sentence Traditional Chinese community snapshot (max 200 chars)
3. Stores in `shops.community_summary`
4. Enqueues `GENERATE_EMBEDDING` (priority 2)

---

## 5. Maintenance & Staleness

### Smart Staleness Sweep (daily 3:00 AM)

1. Find shops enriched > 90 days ago (batch limit: 100)
2. For each: scrape only the 5 most recent reviews via Apify
3. Compare latest scraped review date vs. latest stored review date
4. **If newer reviews found:** enqueue `SCRAPE_SHOP` (full pipeline re-run)
5. **If no new reviews:** update `last_checked_at`, skip

This avoids wasting Apify credits + LLM tokens on shops with no new data.

### Community Re-embedding (daily 3:01 AM)

1. Find live shops where `check_ins.created_at > shops.last_embedded_at` and check-in text >= 15 chars
2. For each: enqueue `SUMMARIZE_REVIEWS` --> `GENERATE_EMBEDDING`
3. Effect: user check-in text becomes searchable via embeddings

---

## 6. External Providers

| Provider | Service | Model/Actor | Used by |
|---|---|---|---|
| Apify | Google Maps scraping | `compass/crawler-google-places` | SCRAPE_SHOP, SCRAPE_BATCH, staleness reviews-only |
| Anthropic | Shop enrichment | `claude-sonnet-4-6` | ENRICH_SHOP, ENRICH_MENU_PHOTO, ASSIGN_TAROT |
| Anthropic | Photo classification | `claude-haiku-4-5-20251001` | CLASSIFY_SHOP_PHOTOS |
| Anthropic | Review summarization | `claude-haiku-4-5-20251001` | SUMMARIZE_REVIEWS |
| OpenAI | Text embeddings | `text-embedding-3-small` (1536d) | GENERATE_EMBEDDING |

All providers accessed through protocol interfaces in `backend/providers/`. Business logic never imports provider SDKs directly.

---

## 7. Admin Controls

### Import & Bulk Operations

| Action | Endpoint |
|---|---|
| Import from Cafe Nomad | `POST /admin/shops/import/cafe-nomad` |
| Import from Google Takeout | `POST /admin/shops/import/google-takeout` |
| Create shop manually | `POST /admin/shops` |
| Bulk approve (triggers scrape) | `POST /admin/shops/bulk-approve` |

### Per-Shop Pipeline Controls

| Action | Endpoint |
|---|---|
| Manual enqueue job | `POST /admin/shops/{id}/enqueue` (ENRICH_SHOP, GENERATE_EMBEDDING, SCRAPE_SHOP) |
| Approve submission | `POST /admin/pipeline/approve/{submission_id}` |
| Reject submission | `POST /admin/pipeline/reject/{submission_id}` |

### Job Management

| Action | Endpoint |
|---|---|
| List jobs (filterable) | `GET /admin/pipeline/jobs` |
| Pipeline overview | `GET /admin/pipeline/overview` |
| Dead letter queue | `GET /admin/pipeline/dead-letter` |
| Retry failed job | `POST /admin/pipeline/retry/{job_id}` |
| Cancel job | `POST /admin/pipeline/jobs/{job_id}/cancel` |
| List batches | `GET /admin/pipeline/batches` |
| Batch detail | `GET /admin/pipeline/batches/{batch_id}` |

---

## 8. Key Constants

| Constant | Value | Location | Used by |
|---|---|---|---|
| `CHECKIN_MIN_TEXT_LENGTH` | 15 chars | `models/types.py:454` | embedding, summarization, re-embed detection |
| `MAX_COMMUNITY_TEXTS` | 20 | `models/types.py:458` | embedding, summarization |
| Photo menu cap | 5 per shop | `classify_shop_photos.py:14` | photo classification |
| Photo vibe cap | 10 per shop | `classify_shop_photos.py:15` | photo classification |
| Photo max age | 5 years | `apify_adapter.py:20` | scraper photo filtering |
| Photo total cap | 30 | `apify_adapter.py:21` | scraper photo filtering |
| Staleness threshold | 90 days | `staleness_sweep.py` | staleness cron |
| Fuzzy dedup threshold | 80% name + 200m | `prefilter.py:28,31` | import dedup |
| Embedding warn threshold | 6000 chars | `generate_embedding.py:73` | embedding text budget |
| Account deletion grace | 30 days | `account_deletion.py` | PDPA compliance |

---

## 9. Known Gaps

| Gap | Impact | Notes |
|---|---|---|
| No social media fields (`instagram`, `facebook`, `line_url`) | DEV-209 blocked for social links | Columns don't exist in DB; Apify actor may return social data but it's not extracted |
| `google_place_id` not in API response | Google Maps link not surfaceable in UI | Column exists and is populated; just missing from `_SHOP_DETAIL_COLUMNS` |
| No secondary website scraping | Social handles can't be extracted from shop websites | Only Google Maps data is scraped |
| Cafe Nomad URLs always pass URL check | Dead shops may reach `pending_review` | Constructed search URLs return 200; admin review is the quality gate |
