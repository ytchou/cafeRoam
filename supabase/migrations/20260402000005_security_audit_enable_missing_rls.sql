-- Security audit: enable RLS on tables that were missing it.
-- These are all internal or public-read-only tables; no permissive write policies added.

-- search_cache: internal system table, service-role access only
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- batch_runs: internal pipeline table, service-role access only
ALTER TABLE batch_runs ENABLE ROW LEVEL SECURITY;

-- batch_run_shops: internal pipeline table, service-role access only
ALTER TABLE batch_run_shops ENABLE ROW LEVEL SECURITY;

-- vibe_collections: public read-only editorial data; allow SELECT, deny all writes via PostgREST
ALTER TABLE vibe_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vibe_collections_public_read" ON vibe_collections
  FOR SELECT USING (true);
