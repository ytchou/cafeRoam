-- Search observability: log queries and zero-result rates (DEV-9)
CREATE TABLE IF NOT EXISTS search_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_anon  TEXT NOT NULL,
  query_text    TEXT NOT NULL,
  query_type    TEXT NOT NULL,
  mode_filter   TEXT,
  result_count  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE search_events IS 'Search query log for observability. user_id_anon is a one-way hash — no PII.';

CREATE INDEX idx_search_events_created_at ON search_events (created_at);
CREATE INDEX idx_search_events_zero_results ON search_events (result_count) WHERE result_count = 0;
CREATE INDEX idx_search_events_query_type ON search_events (query_type);
