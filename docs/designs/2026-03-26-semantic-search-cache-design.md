# Design: Semantic Search Cache (DEV-36)

Date: 2026-03-26

## Goal

Reduce OpenAI embedding API cost and search latency by introducing a two-tier semantic cache over the search pipeline. Unlike traditional exact-match caches, this cache uses vector similarity to serve results for semantically similar queries — "好喝咖啡 大安" matches a cached "大安區 好咖啡" without re-running the full pipeline.

## Architecture

Two-tier cache backed by a single pgvector-enabled Supabase table:

```
User query
    │
    ▼
┌─────────────────────────┐
│ Tier 1: Exact text match │  ← normalized text hash lookup (microsecond)
│ (cache hit? → return)    │
└──────────┬──────────────┘
           │ miss
           ▼
┌─────────────────────────┐
│ Embed query (OpenAI)     │  ← ~20ms, ~$0.0001
└──────────┬──────────────┘
           ▼
┌─────────────────────────────────┐
│ Tier 2: Semantic similarity      │  ← pgvector cosine on cache table
│ (similarity ≥ 0.85? → return)   │
└──────────┬──────────────────────┘
           │ miss
           ▼
┌─────────────────────────┐
│ Full search pipeline     │  ← pgvector search_shops RPC + taxonomy boost
│ (cache result on return) │
└─────────────────────────┘
```

**Why two tiers:** Tier 1 catches identical queries at zero cost (no embedding call). Tier 2 catches paraphrases and typos by comparing embeddings. On a full miss, the result is cached for future queries.

## Key Design Decisions

| Decision             | Choice                              | Rationale                                                                                                                                       |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Cache backend        | pgvector table in Supabase          | No new infra. Already have pgvector. Scale is low (~164 shops, growing). Redis can be added later behind provider abstraction.                  |
| Similarity threshold | 0.85 (cosine)                       | Industry balanced default (Redis guide). GPTCache paper optimal is 0.80, but mixed Chinese/English queries add noise. Configurable via env var. |
| Result TTL           | 4 hours                             | Shop data changes infrequently. New shops are batch operations. Balances freshness with hit rate.                                               |
| Cache key components | Normalized query text + mode filter | Mode filter (work/rest/social) affects results significantly. Geo filters excluded — too granular (every lat/lng would be unique).              |
| Cache population     | Lazy / on-demand only               | Cache fills as users search. Pre-warming from search_events deferred to V2 if hit rates are low.                                                |
| Single table         | Embedding + results co-located      | Simpler than separate embedding cache + result cache. One row, one TTL, two index paths (hash + HNSW).                                          |

## Cache Table Schema

```sql
CREATE TABLE search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,           -- SHA-256 of normalized text + mode
  query_text TEXT NOT NULL,           -- original normalized text (debugging)
  mode_filter TEXT,                   -- work | rest | social | NULL
  query_embedding vector(1536),       -- for Tier 2 semantic lookup
  results JSONB NOT NULL,             -- serialized SearchResult[]
  hit_count INT DEFAULT 0,           -- tracks cache effectiveness
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL     -- created_at + TTL
);

-- Tier 1: exact hash lookup
CREATE UNIQUE INDEX idx_search_cache_hash ON search_cache(query_hash);

-- Tier 2: semantic similarity (HNSW for ANN)
CREATE INDEX idx_search_cache_embedding ON search_cache
  USING hnsw (query_embedding vector_cosine_ops);

-- TTL cleanup
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);
```

## Query Normalization

Before cache lookup, normalize the query text:

1. Lowercase
2. Strip leading/trailing whitespace
3. Collapse internal whitespace to single space
4. Remove trailing punctuation (`?`, `.`, `!`)

Cache key = SHA-256 of `f"{normalized_text}|{mode_filter or ''}"`.

## Configuration

```
SEARCH_CACHE_TTL_SECONDS=14400           # 4 hours (default)
SEARCH_CACHE_SIMILARITY_THRESHOLD=0.85   # cosine similarity threshold
```

Both configurable via env vars. No code changes needed to tune.

## Cache Lookup Flow

```python
async def search(self, query: SearchQuery, mode: str | None) -> list[SearchResult]:
    normalized = normalize_query(query.text)
    cache_key = hash_cache_key(normalized, mode)

    # Tier 1: exact match
    cached = await self._cache.get_by_hash(cache_key)
    if cached and not cached.is_expired:
        await self._cache.increment_hit(cached.id)
        return cached.results

    # Embed query (needed for both Tier 2 and full search)
    embedding = await self._embeddings.embed(normalized)

    # Tier 2: semantic match
    similar = await self._cache.find_similar(embedding, mode, threshold=0.85)
    if similar and not similar.is_expired:
        await self._cache.increment_hit(similar.id)
        return similar.results

    # Full search pipeline
    results = await self._full_search(embedding, query, mode)

    # Cache the result (fire-and-forget)
    await self._cache.store(cache_key, normalized, mode, embedding, results)

    return results
```

## Provider Abstraction

Following the project's provider pattern:

- `backend/providers/cache/interface.py` — `SearchCacheProvider` protocol
- `backend/providers/cache/supabase_adapter.py` — pgvector-backed implementation
- `backend/providers/cache/__init__.py` — factory wired via `Depends()`

## Cache Cleanup

Periodic cleanup via `pg_cron`:

```sql
SELECT cron.schedule('cleanup-search-cache', '0 * * * *',
  $$DELETE FROM search_cache WHERE expires_at < now()$$
);
```

Runs hourly. Deletes expired entries.

## Observability

- `hit_count` column tracks per-entry cache effectiveness
- Add `cache_hit: bool` field to `search_events` table
- Dashboard query: `SELECT COUNT(*) FILTER (WHERE cache_hit) / COUNT(*) as hit_rate FROM search_events`
- Existing search event logging continues on every request (including cache hits)

## V1 Scope Boundaries

**In scope:**

- Two-tier cache (exact + semantic)
- pgvector cache table with HNSW index
- Configurable TTL and similarity threshold via env vars
- Cache hit/miss observability in search_events
- Provider abstraction for future Redis migration

**Out of scope (V2+):**

- Pre-warming from search_events analytics
- Invalidation on shop publish/re-enrichment
- Per-query learned thresholds (vCache paper approach)
- Geo-aware caching
- Redis backend

## Industry Research

Design informed by:

- **GPTCache** (Zilliz): Two-tier architecture, 0.80 optimal threshold via F1 maximization
- **vCache** (2025 paper): Global thresholds are fundamentally limited; per-query thresholds achieve 2x hits with 6x fewer errors
- **Redis Semantic Cache guide**: Start at 0.85-0.95, tune down with monitoring
- **Brain.co benchmark**: 65x latency reduction, 20% hit rate at $2,560/day savings at 100K queries
- **LangCache-Embed** (2025): Domain-specific embeddings improve precision from 64% to 84%

## Testing Classification

**(a) New e2e journey?**

- [ ] No — search is an existing critical path. Cache is transparent to the user.

**(b) Coverage gate impact?**

- [x] Yes — touches `search_service.py` (critical path). Verify 80% coverage gate for search service.
