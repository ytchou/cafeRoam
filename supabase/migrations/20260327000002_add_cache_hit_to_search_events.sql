ALTER TABLE search_events
  ADD COLUMN cache_hit BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN search_events.cache_hit IS 'Whether this search was served from the semantic cache.';
