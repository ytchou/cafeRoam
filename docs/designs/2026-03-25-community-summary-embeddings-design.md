# Design: LLM Summarization for Check-in Review Embeddings (DEV-23)

Date: 2026-03-25

## Overview

Replace raw concatenation of check-in texts in shop embeddings with Claude Haiku–generated community summaries. The summary is stored as `shops.community_summary` — a first-class column used both as the embedding community text block and as a displayable "What visitors say" field on the shop detail page and search result cards.

DEV-7 shipped raw concatenation with the explicit note: "LLM summarization deferred to future ticket." This is that ticket.

## Architecture

### Data Flow

```
Nightly cron (03:30 Asia/Taipei)
  ↓
  handle_reembed_reviewed_shops()
    → find_shops_needing_review_reembed()
    → enqueue SUMMARIZE_REVIEWS per shop (priority=2)
  ↓
  handle_summarize_reviews(shop_id)
    → fetch top 20 ranked texts via get_ranked_checkin_texts() RPC
    → if no qualifying texts: skip Claude → enqueue GENERATE_EMBEDDING directly
    → else: call LLMProvider.summarize_reviews(texts) → Claude Haiku
    → UPDATE shops.community_summary, shops.community_summary_updated_at
    → enqueue GENERATE_EMBEDDING (priority=2)
  ↓
  handle_generate_embedding(shop_id)
    → if shops.community_summary present: use as community text block
    → else: fallback to raw concatenation (existing behavior, unchanged)
    → embed via OpenAI text-embedding-3-small
    → UPDATE shops.embedding, shops.last_embedded_at
```

### Components

#### 1. DB Migration

```sql
ALTER TABLE shops ADD COLUMN community_summary TEXT;
ALTER TABLE shops ADD COLUMN community_summary_updated_at TIMESTAMPTZ;
-- Add SUMMARIZE_REVIEWS to job_type enum
ALTER TYPE job_type ADD VALUE 'SUMMARIZE_REVIEWS';
```

Both columns nullable. `community_summary_updated_at` enables future staleness logic (re-summarize only if N new check-ins since last summary).

#### 2. LLM Provider — `summarize_reviews()` method

Add to `LLMProvider` protocol (`backend/providers/llm/interface.py`):

```python
async def summarize_reviews(self, texts: list[str]) -> str: ...
```

Implement in `AnthropicAdapter` using Claude Haiku (`claude-haiku-4-5-20251001`). Prompt is bilingual-aware (zh/en mixed ok). Target output: ~150–200 chars, 2–4 sentence thematic summary of what visitors say (drinks, food, atmosphere, work-suitability).

Example output: `顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。咖啡豆選用衣索比亞日曬，果香明顯。`

#### 3. New Worker Handler — `backend/workers/handlers/summarize_reviews.py`

```python
async def handle_summarize_reviews(payload, db, llm, queue):
    shop_id = payload["shop_id"]
    texts = await db.rpc("get_ranked_checkin_texts", {"p_shop_id": shop_id})
    if not texts:
        # No qualifying reviews → skip Claude, embed directly
        await queue.enqueue(JobType.GENERATE_EMBEDDING, {"shop_id": shop_id}, priority=2)
        return
    summary = await llm.summarize_reviews([t["text"] for t in texts])
    await db.table("shops").update({
        "community_summary": summary,
        "community_summary_updated_at": "now()",
    }).eq("id", shop_id).execute()
    await queue.enqueue(JobType.GENERATE_EMBEDDING, {"shop_id": shop_id}, priority=2)
```

#### 4. Scheduler Update — `backend/workers/scheduler.py`

Add dispatch case for `SUMMARIZE_REVIEWS`:

```python
case JobType.SUMMARIZE_REVIEWS:
    llm = get_llm_provider()
    await handle_summarize_reviews(payload=job.payload, db=db, llm=llm, queue=queue)
```

#### 5. `handle_generate_embedding()` Update

Replace raw `community_texts` join with summary-first logic:

```python
# Prefer stored community_summary; fall back to raw concatenation
community_block = shop.get("community_summary")
if not community_block and community_texts:
    community_block = ". ".join(community_texts)
if community_block:
    text = f"{text} || {community_block}"
```

#### 6. Backfill Script — `backend/scripts/backfill_community_summaries.py`

One-time script that enqueues `SUMMARIZE_REVIEWS` for all live shops with ≥1 qualifying check-in text. Idempotent: skips shops where `community_summary_updated_at > (now() - interval '1 day')`.

Run on deploy:

```bash
cd backend && uv run python scripts/backfill_community_summaries.py
```

Estimated cost: ~$0.49 (164 shops × $0.003).

## Design Decisions

### Two Separate Job Types (not inline summarization)

`SUMMARIZE_REVIEWS` and `GENERATE_EMBEDDING` are independent jobs. This means:

- Each is retriable independently (Claude failure doesn't waste an embedding API call)
- `community_summary` is persisted to DB before embedding runs — durable across retries
- Clean separation of concerns: summarization handler has no knowledge of embedding logic

### Graceful Fallback

`handle_generate_embedding()` reads `community_summary` if present, otherwise falls back to raw concatenation. This ensures:

- Live shops continue to re-embed even if their summary fails
- No regression for shops that haven't been summarized yet
- Existing shops stay searchable during the backfill window

### Claude Haiku over Sonnet

Summarizing 20 short review snippets into a 150–200 char thematic summary is a constrained, structured extraction task — exactly the task Haiku was chosen for in DEV-6 enrichment. Cost delta: $0.003 (Haiku) vs. $0.03 (Sonnet) per shop. If quality proves insufficient post-launch, swap the model behind `LLMProvider` — no structural change.

### community_summary as First-Class Column

`community_summary` is not just an embedding artifact — it's a user-facing display field:

- Shop detail page: "What visitors say" section
- Search result cards: community snippet

A separate UI ticket (DEV-UI-COMMUNITY-SUMMARY) tracks the display work.

## Token Budget

With summary replacing raw concatenation, the community text block shrinks significantly:

| Component               | Tokens (raw)     | Tokens (summarized) |
| ----------------------- | ---------------- | ------------------- |
| Shop name + description | ~200             | ~200                |
| Menu items              | ~100             | ~100                |
| Community block         | ~1000 (20 × ~50) | ~50 (200 chars)     |
| **Total**               | **~1300**        | **~350**            |

Summarization frees ~950 tokens — headroom for future enrichment fields.

## Error Handling

| Scenario                    | Behavior                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| Claude call fails           | Job fails; retried up to 3×. Embedding not triggered until summary succeeds. |
| No qualifying texts         | Skip Claude; directly enqueue `GENERATE_EMBEDDING` (no summary written).     |
| `community_summary` is NULL | `handle_generate_embedding()` falls back to raw concatenation.               |
| Backfill re-run             | Skip shops where `community_summary_updated_at > (now() - 1 day)`.           |

## Testing Strategy

### Backend (pytest)

**`test_handle_summarize_reviews.py`** (new):

- Happy path: texts fetched → Claude called → summary stored → GENERATE_EMBEDDING enqueued
- No-texts guard: empty text list → Claude skipped → GENERATE_EMBEDDING enqueued directly
- LLM failure → job fails (no embedding enqueued)
- Summary stored with correct `community_summary_updated_at`

**`test_handle_generate_embedding.py`** (update):

- Existing tests: verify fallback behavior when `community_summary` is NULL (raw concat)
- New test: when `community_summary` is set → used as community block, raw texts not used

**`test_llm_provider.py`** (update):

- Add `summarize_reviews()` contract test: input list[str] → non-empty string output

**`test_backfill_community_summaries.py`** (new):

- Idempotency: shops with recent `community_summary_updated_at` are skipped
- Only live shops with qualifying texts are enqueued

### Testing Classification

- [ ] **New e2e journey?** No — summarization is backend-only; no new critical user path.
- [x] **Coverage gate impact?** Yes — touches `generate_embedding` handler (critical path). Verify 80% coverage gate for `backend/workers/handlers/`.

## Cost Estimate

| Scenario                             | Cost         |
| ------------------------------------ | ------------ |
| One-time backfill (164 shops)        | ~$0.49       |
| Nightly re-summarize (~10 shops avg) | ~$0.03/night |
| Monthly steady-state                 | ~$0.90/month |

## Future Work

- **Staleness threshold:** Re-summarize only if ≥N new check-ins since `community_summary_updated_at` (avoids unnecessary Claude calls for high-volume shops)
- **UI display:** Shop detail "What visitors say" + search card snippet (separate ticket)
- **Usefulness score:** Stored score on `check_ins` for weighted summarization input (DEV-8 family)
