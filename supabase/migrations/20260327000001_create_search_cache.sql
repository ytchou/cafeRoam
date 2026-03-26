-- Two-tier semantic search cache: exact hash (Tier 1) + pgvector cosine similarity (Tier 2)
CREATE TABLE search_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash      TEXT NOT NULL,
  query_text      TEXT NOT NULL,
  mode_filter     TEXT,
  query_embedding vector(1536),
  results         JSONB NOT NULL,
  hit_count       INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE search_cache IS 'Two-tier semantic search cache. Tier 1: exact hash. Tier 2: pgvector cosine similarity.';

-- Tier 1: exact hash lookup
CREATE UNIQUE INDEX idx_search_cache_hash ON search_cache(query_hash);

-- Tier 2: ANN semantic similarity
CREATE INDEX idx_search_cache_embedding ON search_cache
  USING hnsw (query_embedding vector_cosine_ops);

-- TTL cleanup index
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);

-- No RLS — this is an internal system table, not user-facing.
-- Only accessed by the service role client from the Python backend.
