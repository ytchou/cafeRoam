# Data Pipeline — Full Design

Date: 2026-02-26

## Overview

The data pipeline is a Postgres-backed job queue with linear job chaining. Two ingestion paths feed into the same processing pipeline: a cold start for initial data (Google Takeout + Cafe Nomad) and ongoing user submissions (Google Maps URLs).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION PATHS                         │
│                                                             │
│  Cold Start (Admin)              User Submission            │
│  ┌──────────────┐                ┌──────────────┐           │
│  │Google Takeout │                │Google Maps   │           │
│  │GeoJSON parse  │                │URL submitted │           │
│  │  + Cafe Nomad │                │via UI form   │           │
│  └──────┬───────┘                └──────┬───────┘           │
│         │ batch insert                  │ single insert     │
│         ▼                               ▼                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │          shops table (processing_status: pending) │       │
│  └──────────────────────┬───────────────────────────┘       │
│                         │                                   │
│                    queue SCRAPE_SHOP                         │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 PROCESSING PIPELINE                          │
│                                                             │
│  SCRAPE_SHOP          →  Apify Google Maps scrape           │
│    (status: scraping)     reviews + photos + hours + menu   │
│         │                                                   │
│    queue ENRICH_SHOP                                        │
│         ▼                                                   │
│  ENRICH_SHOP          →  Claude Sonnet enrichment           │
│    (status: enriching)    taxonomy tags + summary + modes   │
│         │                                                   │
│    queue GENERATE_EMBEDDING                                 │
│         ▼                                                   │
│  GENERATE_EMBEDDING   →  OpenAI text-embedding-3-small     │
│    (status: embedding)    1536-dim vector for pgvector      │
│         │                                                   │
│    queue PUBLISH_SHOP                                       │
│         ▼                                                   │
│  PUBLISH_SHOP         →  Set status: live                   │
│    (status: publishing)   Emit activity feed event          │
│                           Flag for admin review             │
│                                                             │
│  On failure (any step): retry with exponential backoff      │
│  After max attempts: dead-letter + admin notification       │
│  On permanent failure: in-app notification to submitter     │
└─────────────────────────────────────────────────────────────┘
```

Scheduled jobs (separate from the submission pipeline):
- **Smart staleness sweep** (daily 3 AM): Check for shops with new Google reviews since last enrichment. Queue re-enrichment only for changed shops.
- **Weekly email** (Monday 9 AM): Curated content to opted-in users.
- **Account deletion cleanup** (daily 4 AM): Cascade delete user data (PDPA).
- **Admin digest email** (daily 8 AM): Summary of new submissions, failures, and flagged shops.

## Database Schema

### `job_queue` table

```sql
CREATE TABLE job_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type    TEXT NOT NULL,        -- e.g. 'scrape_shop', 'enrich_shop', etc.
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | claimed | completed | failed | dead_letter
  payload     JSONB NOT NULL,       -- job-specific data (shop_id, submission_id, etc.)
  priority    INT NOT NULL DEFAULT 0,  -- 0 = normal, 1 = low (staleness), 2 = high (user submission)
  attempts    INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  claimed_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at   TIMESTAMPTZ,
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,       -- for exponential backoff
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the claim query (FOR UPDATE SKIP LOCKED)
CREATE INDEX idx_job_queue_claimable
  ON job_queue (priority DESC, created_at ASC)
  WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now());
```

### `shop_submissions` table

```sql
CREATE TABLE shop_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by    UUID NOT NULL REFERENCES auth.users(id),
  google_maps_url TEXT NOT NULL,
  shop_id         UUID REFERENCES shops(id),   -- linked after scrape creates the shop
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | live | failed
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `activity_feed` table

```sql
CREATE TABLE activity_feed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,     -- 'shop_added', 'check_in', 'list_created'
  actor_id    UUID REFERENCES auth.users(id),  -- NULL for system events
  shop_id     UUID REFERENCES shops(id),
  metadata    JSONB,             -- extra context (shop name, photo URL, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_feed_recent ON activity_feed (created_at DESC);
```

### Additions to `shops` table

```sql
ALTER TABLE shops ADD COLUMN processing_status TEXT DEFAULT 'live';
  -- Values: pending | scraping | enriching | embedding | publishing | live | failed
ALTER TABLE shops ADD COLUMN last_enriched_at TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN google_place_id TEXT;
ALTER TABLE shops ADD COLUMN source TEXT;  -- 'cafe_nomad', 'google_takeout', 'user_submission'
```

### RPC: `claim_job`

```sql
CREATE OR REPLACE FUNCTION claim_job(worker_id TEXT)
RETURNS SETOF job_queue AS $$
  UPDATE job_queue
  SET status = 'claimed', claimed_at = now(), updated_at = now()
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql;
```

## Job Handlers

### SCRAPE_SHOP

```
Input:  { shop_id: UUID, google_maps_url: str }
Action:
  1. Call Apify Google Maps scraper with the URL
  2. Extract: name, address, coordinates, hours, rating, reviews (max 20),
     photos (max 10), menu URL, Google Place ID
  3. Upsert shop record with scraped data
  4. Update shop.processing_status = 'scraped'
Output: Queue ENRICH_SHOP with { shop_id }
Error:  If Apify can't find the place → mark submission as failed,
        notify submitter ("We couldn't find a coffee shop at that link")
```

### ENRICH_SHOP

```
Input:  { shop_id: UUID }
Action:
  1. Load shop + reviews from DB
  2. Call LLMProvider.enrich_shop() (Claude Sonnet)
     - Taxonomy tags + confidence scores
     - Summary (2-3 sentences)
     - Mode scores (work/rest/social, 0.0-1.0)
  3. Store enrichment result on shop record
  4. Update shop.processing_status = 'enriched'
  5. Update shop.last_enriched_at = now()
Output: Queue GENERATE_EMBEDDING with { shop_id }
```

### GENERATE_EMBEDDING

```
Input:  { shop_id: UUID }
Action:
  1. Load shop summary + tags from DB
  2. Compose embedding text: "{summary} | Tags: {tags}"
  3. Call EmbeddingsProvider.embed(text) → 1536-dim vector
  4. Store vector in shop.embedding column (pgvector)
  5. Update shop.processing_status = 'embedded'
Output: Queue PUBLISH_SHOP with { shop_id }
```

### PUBLISH_SHOP

```
Input:  { shop_id: UUID }
Action:
  1. Set shop.processing_status = 'live'
  2. If user submission: update shop_submissions.status = 'live'
  3. Insert activity_feed event ('shop_added', actor=submitter, shop_id)
  4. Flag for admin review (set reviewed_at = NULL)
Output: None (terminal step)
```

### SMART_STALENESS_SWEEP (cron, daily 3 AM)

```
Action:
  1. For each shop where last_enriched_at > 90 days ago:
     a. Quick-scrape via Apify (reviews only, minimal cost)
     b. Compare latest review dates to stored reviews
     c. If new reviews found → queue ENRICH_SHOP at priority=1 (low)
     d. If no new reviews → skip, update last_checked_at
  2. Also queue re-enrichment for shops with user-reported stale info
```

### ENRICH_MENU_PHOTO (triggered by check-in)

```
Input:  { shop_id: UUID, photo_url: str }
Action:
  1. Call LLMProvider.extract_menu_data(photo_url)
  2. Store extracted menu items on shop record
  3. Optionally queue ENRICH_SHOP if menu data significantly changes the shop profile
```

## Cold Start Pipeline

### Google Takeout Parser

Google Takeout saved places export a GeoJSON file (`Saved Places.json`).

The parser:
1. Reads the GeoJSON file
2. Filters to Taiwan coordinates (bounding box)
3. Deduplicates against existing shops (by Google Place ID or coordinates + name similarity)
4. Inserts new shops with `source='google_takeout'`, `processing_status='pending'`
5. Queues `SCRAPE_SHOP` jobs for all new shops at `priority=0` (normal)

### Cafe Nomad Importer

Ported from prebuild `pass0-seed.json` logic to Python:
1. Fetch Cafe Nomad API (`https://cafenomad.tw/api/v1.2/cafes/taipei`)
2. Filter: remove closed, shell companies, out-of-bounds, duplicates
3. Insert with `source='cafe_nomad'`, `processing_status='pending'`
4. Queue `SCRAPE_SHOP` jobs

### Rate Limiting for Batch

- All jobs are queued at once (just rows in Postgres)
- Worker poll loop processes them one at a time (30s intervals)
- Configurable concurrency limit (default: 1 concurrent scrape job)
- At 1 job per 30s, 200 shops takes ~100 minutes for scraping; enrichment + embedding add ~30-40 more minutes
- Total cold start: ~2-3 hours for 200+ shops

## Search Service

### Semantic Search with Mode Pre-filtering

```sql
-- Step 1: Pre-filter by mode
SELECT id FROM shops
WHERE mode_scores->>'work' > 0.4
  AND processing_status = 'live'

-- Step 2: Semantic search within filtered set
SELECT s.id, s.name, s.summary, s.tags,
       1 - (s.embedding <=> query_embedding) AS similarity,
       taxonomy_boost(s.tags, query_tokens) AS boost
FROM shops s
WHERE s.id IN (filtered_ids)
ORDER BY (similarity * 0.7 + boost * 0.3) DESC
LIMIT 10
```

### Taxonomy Boost Algorithm

Ported from prebuild `pass3c-postprocess.ts` (IDF-based distinctiveness):

```python
def taxonomy_boost(shop_tags: list[str], query_tokens: list[str]) -> float:
    matching_tags = [t for t in shop_tags if any(token in t for token in query_tokens)]
    if not matching_tags:
        return 0.0
    idf_scores = [compute_idf(tag) for tag in matching_tags]
    return sum(idf_scores) / len(shop_tags)
```

IDF values are precomputed nightly (or after any new shop is published) and cached.

### Search API

```
GET /api/search?q=quiet+wifi&mode=work&limit=10
```

Requires authentication. Returns shops ranked by combined similarity + taxonomy boost score.

## Monitoring & Error Handling

### Error Handling

| Failure Type | Behavior | Max Retries | Backoff |
|---|---|---|---|
| Apify scrape timeout | Retry with same params | 3 | 60s, 300s, 900s |
| Apify place not found | Permanently failed, notify submitter | 1 (no retry) | — |
| Claude enrichment error | Retry | 3 | 60s, 300s, 900s |
| OpenAI embedding error | Retry | 3 | 30s, 120s, 300s |
| Apify rate limit | Retry with longer backoff | 5 | 300s, 600s, 1800s, 3600s, 7200s |

After max retries exhausted: move to `dead_letter` status, flag in admin dashboard.

### Monitoring

| What | How |
|---|---|
| Job queue depth | Postgres query: count of pending jobs by type. Exposed via `/admin/metrics`. |
| Job failure rate | Count of failed + dead_letter jobs in last 24h. Alert if > 10%. |
| Enrichment cost tracking | Log token usage per enrichment call. Monthly aggregate in admin dashboard. |
| Pipeline latency | Time from submission to `live` status. Track p50/p95 in PostHog. |
| Worker health | APScheduler heartbeat. Sentry captures unhandled exceptions. |

### Admin Dashboard API

```
GET  /admin/pipeline/overview     -- job counts by status, submissions today
GET  /admin/pipeline/submissions  -- recent submissions with status
GET  /admin/pipeline/dead-letter  -- failed jobs for investigation
POST /admin/pipeline/retry/{id}   -- manually retry a dead-letter job
POST /admin/pipeline/reject/{id}  -- reject a submission (remove shop)
```

Protected by admin role check.

### Notifications

| Event | Recipient | Channel |
|---|---|---|
| Shop published (user submission) | Submitter | Activity feed (public) |
| Submission permanently failed | Submitter | In-app notification (private) |
| Daily digest (new shops, failures) | Admin | Email via Resend |
| Dead-letter job | Admin | Admin dashboard + daily digest |

## Deployment

### Railway Services

```
Railway Project
├── caferoam-api       (FastAPI, serves HTTP requests)
└── caferoam-worker    (FastAPI + APScheduler, no HTTP traffic)
```

The worker service:
- Runs `uvicorn` with a health check endpoint (`/health`)
- APScheduler starts on boot, runs the poll loop + cron jobs
- Shares the same Supabase database as the API
- Shares the same provider secrets (Apify, Anthropic, OpenAI keys)

### Worker Entry Point

```python
# backend/worker_main.py
from fastapi import FastAPI
from workers.scheduler import start_scheduler

app = FastAPI()

@app.on_event("startup")
async def startup():
    start_scheduler()

@app.get("/health")
async def health():
    return {"status": "ok", "scheduler": "running"}
```

### Scaling

At V1 scale (200 shops, 5-20 submissions/month):
- Single worker instance is sufficient
- 30s poll interval = max 2 jobs/minute throughput
- Horizontal scaling: deploy additional worker instances (FOR UPDATE SKIP LOCKED handles concurrency)

## Key Decisions

| Decision | Rationale | ADR |
|---|---|---|
| Apify ongoing (not one-time) | User submissions need scraping. 5-review limit on Places API is a blocker. | Updated: `2026-02-23-apify-over-outscraper.md` |
| Linear job chain orchestration | Simple, reuses existing job queue. Individual step retries. | `2026-02-26-linear-job-chain-orchestration.md` |
| Smart re-enrichment | Only re-enrich when new reviews detected. Saves ~60% cost vs fixed 90-day cycle. | `2026-02-26-smart-re-enrichment.md` |
| User submissions auto-publish with flagging | Low friction for community growth. Admin reviews async via dashboard. | `2026-02-26-auto-publish-with-flagging.md` |
| Pre-filter then rank for mode search | Uses Postgres indexes efficiently. Simpler than embedding mode into vectors. | `2026-02-26-mode-pre-filter-search.md` |

## Cost Estimate

| Component | Unit Cost | V1 Volume | Monthly Cost |
|---|---|---|---|
| Apify scraping (new shops) | ~$0.02-0.05/shop | 5-20/month | ~$0.10-1.00 |
| Claude Sonnet enrichment | ~$0.62/shop | 5-20 new + 5-10 re-enrichment | ~$6-19 |
| OpenAI embeddings | ~$0.0001/shop | 5-20/month | ~$0.01 |
| Menu photo extraction | ~$0.15/photo | 5-20/month | ~$0.75-3.00 |
| **Total** | — | — | **~$7-23/month** |

Cold start (200+ shops): ~$130 one-time (mostly Claude Sonnet enrichment).
