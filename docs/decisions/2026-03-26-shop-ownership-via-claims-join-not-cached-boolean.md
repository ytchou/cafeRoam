# ADR: Shop verified status derived from shop_claims JOIN, not cached boolean on shops table

Date: 2026-03-26

## Decision

The shop detail API derives `claim_status` by JOINing against `shop_claims` at query time. No `is_claimed` / `is_verified` boolean is cached on the `shops` table.

## Context

Shop detail and search result cards need to know whether a shop has an approved claim (to show the Verified badge). Two options: cache a boolean on `shops`, or JOIN `shop_claims` at read time.

## Alternatives Considered

- **Cached `is_claimed` boolean on `shops` table**: Faster reads (no JOIN), but creates a sync problem — if a claim is ever revoked or the claim record changes, the boolean must be kept in sync. Adds complexity to the approve/reject flows and creates a correctness risk.

## Rationale

At the current scale (<500 shops), the JOIN cost is negligible. The correctness guarantee is worth more than the marginal read performance. A JOIN on an indexed `shop_id` column is O(log n) and adds <1ms at this dataset size. This avoids an entire class of stale-data bugs.

## Consequences

- Advantage: Verified status is always accurate — no sync risk on claim revocation
- Advantage: Single source of truth (shop_claims table)
- Disadvantage: Slight read overhead per shop detail query (acceptable at current scale; can add caching later if needed)
