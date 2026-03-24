# Design: Index Check-in Reviews into Shop Embeddings (DEV-7)

Date: 2026-03-24

## Overview

Enrich shop embedding vectors with community check-in text (notes + reviews) so that searches like "超好喝的拿鐵" surface shops where visitors actually said that. Follows the DEV-6 pattern: supplementary data fetched at embed time, appended to embedding text.

## Architecture

### Data Flow

```
Nightly cron (REEMBED_REVIEWED_SHOPS)
  → Find shops with new check-ins since last embedding
  → Enqueue GENERATE_EMBEDDING for each
  → Handler fetches: shop data + menu items + top 20 ranked check-in texts
  → Builds combined text: "{name}. {description} | {menu items} || {community texts}"
  → Embeds via OpenAI text-embedding-3-small
  → Updates shops.embedding + shops.last_embedded_at (live-safe)
```

### Components

#### 1. Nightly Cron Job — `REEMBED_REVIEWED_SHOPS`

New job type registered in the worker scheduler. Runs once daily at 03:30 CST (Asia/Taipei, UTC+8), offset from the 03:00 CST staleness sweep.

Query: find `shop_id`s where `check_ins.created_at > shops.last_embedded_at` and the check-in has qualifying text (note or review_text ≥15 chars).

Enqueues one `GENERATE_EMBEDDING` job per qualifying shop.

#### 2. New Column — `shops.last_embedded_at`

```sql
ALTER TABLE shops ADD COLUMN last_embedded_at TIMESTAMPTZ;
-- Backfill: set to now() for all shops with existing embeddings
UPDATE shops SET last_embedded_at = now() WHERE embedding IS NOT NULL;
```

Allows the cron job to efficiently find "shops that need re-embedding" without scanning all check-ins.

#### 3. Enhanced `handle_generate_embedding()` — Community Text Fetch

After loading shop data and menu items, fetch top 20 check-in texts:

```sql
SELECT COALESCE(c.review_text, '') || ' ' || COALESCE(c.note, '') as text
FROM check_ins c
LEFT JOIN (
  SELECT checkin_id, COUNT(*) as like_count
  FROM community_note_likes GROUP BY checkin_id
) l ON l.checkin_id = c.id
WHERE c.shop_id = :shop_id
  AND (LENGTH(COALESCE(c.note, '')) >= 15 OR LENGTH(COALESCE(c.review_text, '')) >= 15)
ORDER BY
  l.like_count DESC NULLS LAST,
  CASE WHEN LENGTH(COALESCE(c.review_text, '') || COALESCE(c.note, '')) >= 100 THEN 0 ELSE 1 END,
  c.created_at DESC
LIMIT 20
```

Embedding text structure with double-pipe delimiter (distinct from menu items' single pipe):

```
"{name}. {description} | {menu_item1}, {menu_item2} || {review1}. {review2}. {review3}..."
```

Update `last_embedded_at` after successful embedding.

#### 4. Re-embed Script for Initial Rollout

Similar to `scripts/reembed_live_shops.py` (DEV-6). One-time script to re-embed all shops that have qualifying check-in text. Idempotent.

## Design Decisions

### Text Sources

- **Both `note` and `review_text`** — maximizes signal volume
- **All check-ins included** (not just `is_public = true`) — aggregate embedding vector doesn't expose individual text; private notes safely contribute to search quality

### Selection & Ranking (Per Shop)

- Minimum length: ≥15 chars (either field) to eliminate noise ("👍", "nice", "來過了")
- Ranking: likes DESC → text ≥100 chars prioritized → recency DESC
- Cap: top 20 texts per shop

### Trigger Model

- **Nightly batch** — cron job finds shops needing re-embedding via `last_embedded_at` comparison
- No real-time trigger on check-in insert — community text isn't time-sensitive enough to warrant per-check-in re-embedding

### Aggregation Strategy

- **Raw concatenation with length filter** — no LLM summarization in this iteration
- LLM summarization deferred to future ticket (cost is negligible at ~$0.003/shop, but adds pipeline complexity)

## Token Budget

- OpenAI text-embedding-3-small limit: 8191 tokens
- Shop name + description: ~200 tokens
- Menu items: ~100 tokens
- 20 reviews × ~50 tokens each: ~1000 tokens
- **Total: ~1300 tokens** — well within limit

## Error Handling

- No qualifying texts → skip community section, embed with shop data + menu items only
- Live-shop guard: same as DEV-6 — update `embedding` column only, don't change `processing_status`
- Cron job failure: log error, retry next night. No user-facing impact

## Testing Strategy

- **Unit:** `test_generate_embedding` with check-in texts present vs. absent
- **Unit:** Text selection query returns correct ranking (likes > length > recency)
- **Unit:** Minimum length filter excludes short notes
- **Unit:** `last_embedded_at` is set after successful embedding
- **Integration:** Cron job correctly identifies shops needing re-embedding
- **Manual:** Run re-embed script on staging, verify search results for community terms

## Future Work (Separate Tickets)

- **LLM Summarization:** Replace raw concatenation with Claude-generated community summary per shop
- **Usefulness Score Model:** Stored `usefulness_score` column on `check_ins`, powering both embedding selection and "most helpful reviews" UI
- **DEV-8:** Full RAG pipeline over individual check-in notes (already tracked)
