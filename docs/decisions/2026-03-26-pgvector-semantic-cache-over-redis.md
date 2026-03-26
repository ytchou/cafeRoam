# ADR: pgvector table as semantic cache backend over Redis

Date: 2026-03-26

## Decision

Use a pgvector-enabled Supabase table as the semantic search cache backend, with HNSW indexing for similarity lookup.

## Context

DEV-36 requires a cache layer for semantic search to reduce OpenAI embedding API costs and pgvector query latency. The cache needs to support both exact text matching (Tier 1) and semantic similarity matching (Tier 2), which requires vector storage and ANN search capability.

## Alternatives Considered

- **Redis with RediSearch/RedisVL**: Best performance for both exact-match and vector search. Native TTL support. Rejected: adds a new service to Railway infrastructure, increases operational complexity. Overkill for current query volume (~164 shops, early-stage traffic).
- **In-memory LRU (Python cachetools)**: Fastest hot path for exact matches. Rejected: cache lost on Railway restart/deploy, doesn't share across multiple worker processes, no semantic similarity capability without a separate vector store.

## Rationale

pgvector is already deployed in Supabase for the core `search_shops` RPC. A cache table reuses the same infrastructure with zero new dependencies. HNSW indexing handles ANN search efficiently for the expected cache size (thousands to tens of thousands of entries). The provider abstraction pattern (`SearchCacheProvider` protocol) allows migrating to Redis later without touching the search service — the decision is reversible at low cost.

## Consequences

- Advantage: No new infrastructure, no new cost, familiar tooling, single-table design
- Advantage: Provider abstraction keeps the door open for Redis migration
- Disadvantage: Slightly slower than Redis for hot-path lookups (~5-20ms vs. <1ms)
- Disadvantage: Cache cleanup requires `pg_cron` or application-level expiry logic
