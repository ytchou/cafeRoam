-- Tier 2: find similar cached queries using pgvector cosine distance
CREATE OR REPLACE FUNCTION search_cache_similar(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  filter_mode text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  query_hash TEXT,
  query_text TEXT,
  mode_filter TEXT,
  cache_embedding vector(1536),
  results JSONB,
  hit_count INT,
  expires_at TIMESTAMPTZ,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Bound the HNSW ANN candidate set to limit scan cost.
  -- The default ef_search is tied to ef_construction and can be large;
  -- 40 is sufficient to find the single best match above a 0.85 threshold.
  SET LOCAL hnsw.ef_search = 40;
  RETURN QUERY
  SELECT
    sc.id,
    sc.query_hash,
    sc.query_text,
    sc.mode_filter,
    sc.query_embedding AS cache_embedding,
    sc.results,
    sc.hit_count,
    sc.expires_at,
    (1 - (sc.query_embedding <=> search_cache_similar.query_embedding)) AS similarity
  FROM search_cache sc
  WHERE sc.expires_at > now()
    AND (filter_mode IS NULL OR sc.mode_filter IS NOT DISTINCT FROM filter_mode)
    AND (1 - (sc.query_embedding <=> search_cache_similar.query_embedding)) >= similarity_threshold
  ORDER BY sc.query_embedding <=> search_cache_similar.query_embedding
  LIMIT 1;
END;
$$;

-- Atomic hit count increment
CREATE OR REPLACE FUNCTION increment_search_cache_hit(entry_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE search_cache SET hit_count = hit_count + 1 WHERE id = entry_id;
$$;

-- Hourly cleanup of expired cache entries (pg_cron)
-- Note: pg_cron must be enabled via Supabase dashboard for production.
-- For local dev, expired rows are filtered out at query time (expires_at > now()).
