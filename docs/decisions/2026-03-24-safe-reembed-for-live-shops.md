# ADR: Safe Re-embed for Live Shops — Skip Status Transition

Date: 2026-03-24

## Decision

`handle_generate_embedding()` checks the shop's current `processing_status` before updating it. For shops already in `live` status, it updates only the `embedding` column in-place and does not queue a `PUBLISH_SHOP` job.

## Context

The embedding generation handler was designed for the new-shop pipeline: `enriched` → `embedding` → `publishing` → `live`. It always sets status to `publishing` and queues `PUBLISH_SHOP`.

When re-embedding already-live shops (e.g. after adding menu items to embedding text), this flow would temporarily remove shops from search results: `search_shops` RPC filters `WHERE processing_status = 'live'`, so during the `publishing` window each shop would be invisible.

With 164 live shops and a single-worker queue, full re-embedding could take minutes — an unacceptable user-facing outage for a discovery product.

## Alternatives Considered

- **Always run full pipeline**: Simpler code, but every re-embed causes a search visibility gap per shop. Rejected: user-visible regression.
- **Add a separate re-embed job type**: A new `REEMBED_SHOP` job that bypasses status transitions entirely. Rejected: adds a new job type, dispatcher case, and tests for what is a one-line guard in the existing handler.
- **Bulk SQL update**: Bypass the worker entirely, directly UPDATE all embeddings via script. Rejected: bypasses the provider abstraction (EmbeddingsProvider), making it untestable and provider-coupled.

## Rationale

The status-check guard is the minimum-viable change: one conditional in `handle_generate_embedding()`, no new abstractions, no new job types. The live-shop path skips exactly the two steps that would cause harm (status change + PUBLISH_SHOP), while all other behavior remains identical.

## Consequences

- Advantage: Live shops are never removed from search during re-embedding
- Advantage: No new job type or dispatcher complexity
- Advantage: Re-embedding is idempotent — safe to run multiple times
- Disadvantage: `handle_generate_embedding` now has two distinct behaviors depending on entry state; tests must cover both paths
