# Review Topic Chips — Design

**Date:** 2026-04-10
**Ticket:** DEV-305
**Status:** Approved

## Problem

Shop cards currently show a `community_summary` blurb, but only for shops that have received user check-ins. New shops (zero check-ins) show nothing. Users have no way to quickly scan what a shop is known for — no topic chips, no at-a-glance signal.

## Goal

Surface crowd-sourced topic chips (e.g. "手沖咖啡", "vintage vibe", "服務慢") per shop so users can immediately understand what a shop is known for. Populate `review_topics` from day one using Apify-scraped Google reviews, and blend in community notes once they exist.

## Key Discovery

The ticket's original framing was wrong. `summarize_reviews` reads community check-in texts via `get_ranked_checkin_texts()` RPC — not Google reviews. Google reviews land in `shop_reviews` (populated by `persist_scraped_data`) and are consumed by `enrich_shop` for taxonomy tagging. This design corrects the data-source confusion.

## Architecture

### Data Sources

| Source | Table | Populated by | Used by (before) | Used by (after) |
|---|---|---|---|---|
| Apify-scraped Google reviews | `shop_reviews` | `persist_scraped_data` | `enrich_shop` only | `enrich_shop` + `summarize_reviews` |
| Community check-in notes | `check_ins` via RPC | user check-ins | `summarize_reviews` | `summarize_reviews` (unchanged) |

### Blending Logic

```
google_reviews present, no checkin_texts  →  summarise Google only
both present                              →  blend, slight emphasis on community notes
checkin_texts only                        →  current behavior (unchanged)
neither                                   →  skip LLM, enqueue GENERATE_EMBEDDING
```

### Pipeline Change

**Before:**
```
SCRAPE → CLASSIFY_SHOP_PHOTOS → ENRICH_SHOP → GENERATE_EMBEDDING → PUBLISH_SHOP
```

**After:**
```
SCRAPE → CLASSIFY_SHOP_PHOTOS → ENRICH_SHOP → SUMMARIZE_REVIEWS → GENERATE_EMBEDDING → PUBLISH_SHOP
```

`ENRICH_SHOP` previously enqueued `GENERATE_EMBEDDING` directly. It now enqueues `SUMMARIZE_REVIEWS`. `SUMMARIZE_REVIEWS` already enqueues `GENERATE_EMBEDDING` on completion — the chain stays intact.

### LLM Call

- **Method:** `summarize_reviews` on `LLMProvider` protocol
- **Provider:** OpenAI GPT-5.4-mini (via HybridLLMAdapter — unchanged from DEV-304)
- **Change:** From raw text completion (returns `str`) to tool/function calling (returns `ReviewSummaryResult`)
- **Output:** `{ summary_zh_tw: str, review_topics: [{topic: str, count: int}] }`
- **Prompt:** Instructs model to prefer community notes when both sources present, extract 8–10 zh-TW topic chips with estimated mention counts

### Schema Change

```sql
ALTER TABLE shops ADD COLUMN review_topics JSONB;
-- Schema: [{"topic": "string", "count": integer}]
```

### Admin Dashboard

Show active job type alongside `processing_status` in the admin shops table via a LEFT JOIN on `job_queue`. No new DB status values needed.

```
Before: "Enriching"
After:  "Enriching · Summarizing reviews"
        "Enriching · Classifying photos"
        "Enriching · Generating embedding"
```

## Components Changed

| Component | File | Change |
|---|---|---|
| Scraper config | `backend/providers/scraper/apify_adapter.py` | `reviewsSort: mostRelevant`, `maxReviews: 50` |
| DB migration | `supabase/migrations/20260410000002_add_review_topics_to_shops.sql` | New `review_topics JSONB` column |
| Pydantic types | `backend/models/types.py` | `ReviewTopic`, `ReviewSummaryResult`, `Shop.review_topics` |
| Tool schema | `backend/providers/llm/_tool_schemas.py` | `SUMMARIZE_REVIEWS_TOOL_SCHEMA` |
| LLM interface | `backend/providers/llm/interface.py` | New method signature (dual sources, structured return) |
| Anthropic adapter | `backend/providers/llm/anthropic_adapter.py` | Tool call impl + blending prompt |
| OpenAI adapter | `backend/providers/llm/openai_adapter.py` | Function call impl + blending prompt |
| Handler | `backend/workers/handlers/summarize_reviews.py` | Read `shop_reviews`, persist `review_topics` |
| Pipeline | `backend/workers/handlers/enrich_shop.py` | Enqueue `SUMMARIZE_REVIEWS` instead of `GENERATE_EMBEDDING` |
| Admin API | `backend/api/admin_shops.py` | LEFT JOIN job_queue, `current_job` response field |
| Admin UI | `app/(admin)/admin/shops/_components/ShopTable.tsx` | "Status · Active job" label |
| Admin constants | `app/(admin)/admin/shops/_constants.ts` | `JOB_LABELS` map |
| Backfill | `backend/scripts/backfill_review_topics.py` | Enqueue SUMMARIZE_REVIEWS for live shops with no `review_topics` |

## Alternatives Rejected

- **Separate EXTRACT_REVIEW_TOPICS task** — adds new job type, protocol method, adapters, and pipeline stage. Single-call blending in existing `summarize_reviews` achieves the same result with less surface area.
- **New `summarizing` DB status** — less future-proof than querying active job type from `job_queue`. The LEFT JOIN approach surfaces ALL pipeline stages, not just the new one.
- **Re-scraping existing shops for mostRelevant reviews** — out of scope. The `mostRelevant` sort benefits future scrapes. Backfill runs `SUMMARIZE_REVIEWS` on existing `shop_reviews` data at ~$0.30 total.

## Cost

| Item | Est. cost |
|---|---|
| Scraping delta (maxReviews 20→50, per 100 shops) | ~$3–6 |
| LLM backfill (~300 shops × GPT-5.4-mini) | ~$0.30 |
| Nightly cron increase (~20 shops/night) | ~$0.02/night |
