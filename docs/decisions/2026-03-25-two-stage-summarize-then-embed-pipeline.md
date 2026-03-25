# ADR: Two-Stage Pipeline for Community Summary (SUMMARIZE_REVIEWS → GENERATE_EMBEDDING)

Date: 2026-03-25

## Decision

Implement DEV-23 as two independent job types — `SUMMARIZE_REVIEWS` stores the Claude-generated summary to DB, then enqueues `GENERATE_EMBEDDING` — rather than folding summarization inline into the existing embedding handler.

## Context

DEV-23 adds Claude Haiku summarization of check-in review texts before they're embedded. The main architectural question: should the LLM call happen inside `handle_generate_embedding()` (single job), or as a separate upstream job (`SUMMARIZE_REVIEWS`) that chains to embedding?

## Alternatives Considered

- **Inline in GENERATE_EMBEDDING**: Call Claude inside the existing handler; store summary as a side-effect; embed in the same job. Rejected: a single Claude failure causes the whole embedding job to fail and retry (wasting the embedding API call on retries). Also makes the embedding handler responsible for two distinct concerns.

- **Two-stage without fallback**: `GENERATE_EMBEDDING` hard-requires `community_summary` to be populated. Rejected: a failed `SUMMARIZE_REVIEWS` would block all future embedding updates for that shop until manually retried — too brittle for a nightly pipeline.

## Rationale

Two separate jobs with graceful fallback gives the best failure isolation for this project's DB-as-queue pattern:
- `community_summary` is persisted to DB *before* `GENERATE_EMBEDDING` is enqueued — durable across retries at no extra cost
- If Claude fails, only the summarization job retries; the embedding job is never wasted
- `handle_generate_embedding()` falls back to raw concatenation when `community_summary` is NULL — existing shops continue to re-embed unaffected during the backfill window
- Clean handler boundaries match the existing pattern established in DEV-6/DEV-7

## Consequences

- Advantage: Independent retries for LLM and embedding calls
- Advantage: `community_summary` available in DB for UI display immediately after summarization, before embedding completes
- Advantage: Composable — either stage can be replaced or extended without touching the other
- Disadvantage: Two DB round-trips per shop per nightly run (instead of one); negligible at current scale
