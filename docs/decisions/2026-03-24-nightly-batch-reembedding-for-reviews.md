# ADR: Nightly batch re-embedding for check-in review text

Date: 2026-03-24

## Decision

Re-embed shops with new check-in text on a nightly cron schedule rather than triggering re-embedding immediately on each check-in.

## Context

DEV-7 adds community check-in text (notes + reviews) to shop embeddings. When a new check-in with text is submitted, the shop's embedding should eventually reflect this new community signal. The question is when to trigger re-embedding: immediately (per check-in) or in batch (nightly cron).

The existing pattern from DEV-6 (menu items) uses immediate re-embedding: menu photo extraction → `GENERATE_EMBEDDING` job enqueued. This works well for menu photos because they are infrequent (one per check-in, and only when a menu photo is uploaded).

## Alternatives Considered

- **Immediate per-check-in trigger**: Enqueue `GENERATE_EMBEDDING` on every check-in with text, via DB trigger (same as menu photo pattern). Rejected: community text is not time-sensitive — a 24h delay is acceptable, and popular shops could trigger many redundant re-embeddings in a single day.

- **Debounced trigger (max 1 per shop per hour)**: Rate-limit re-embedding per shop. Rejected: adds debounce logic (check last embedding time before enqueuing) for marginal freshness gain over nightly batch.

## Rationale

Community check-in text is not time-sensitive enough to warrant per-check-in re-embedding. A nightly batch:

- Optimizes embedding API cost (one call per shop per day regardless of check-in volume)
- Avoids redundant re-embeddings for popular shops
- Uses the `last_embedded_at` column to efficiently identify shops needing updates
- Matches the existing `STALENESS_SWEEP` cron pattern

## Consequences

- Advantage: Lower embedding API costs, simpler pipeline, no redundant work
- Advantage: Consistent with existing cron-based worker patterns
- Disadvantage: New community text takes up to 24 hours to influence search results
- Disadvantage: Requires new `last_embedded_at` column on `shops` table
