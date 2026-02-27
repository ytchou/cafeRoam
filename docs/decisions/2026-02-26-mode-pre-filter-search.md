# ADR: Pre-filter Then Rank for Mode-based Search

Date: 2026-02-26

## Decision

Mode filtering (work/rest/social) is applied as a pre-filter before semantic search, not post-filter or embedded into vectors.

## Context

CafeRoam's search supports mode selection (work/rest/social). Each shop has mode scores (0.0-1.0) from AI enrichment. We needed to decide how mode filtering interacts with semantic search (pgvector cosine similarity + taxonomy boost).

## Alternatives Considered

- **Post-filter after search**: Run semantic search across all shops, then filter results by mode. Rejected: may return fewer relevant results if top semantic matches don't fit the selected mode, wasting compute on irrelevant results.
- **Mode as embedding dimension**: Include mode context in the embedding text itself so semantic search inherently considers mode. Rejected: harder to tune, couples mode classification to embedding generation, and makes it impossible to search across modes.

## Rationale

Pre-filtering uses Postgres indexes efficiently (a simple WHERE clause on mode_scores before the expensive pgvector distance computation). At V1 scale (200-500 shops), the filtered set is still large enough for meaningful semantic search results. The threshold (mode_score > 0.4) is tunable without re-generating embeddings.

## Consequences

- Advantage: Uses Postgres indexes. Reduces the pgvector search space.
- Advantage: Mode threshold is independently tunable without re-embedding.
- Advantage: Can search without a mode filter (omit the pre-filter clause) for "all modes" search.
- Disadvantage: Hard cutoff may exclude borderline shops. Mitigated by a generous threshold (0.4, not 0.7).
