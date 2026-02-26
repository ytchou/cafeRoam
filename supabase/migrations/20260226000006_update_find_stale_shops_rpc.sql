-- Add google_place_id to find_stale_shops RPC return type
-- Required by smart staleness sweep to skip shops with no new reviews
-- batch_limit caps results per run to prevent flooding the job queue
CREATE OR REPLACE FUNCTION find_stale_shops(
  days_threshold INT DEFAULT 90,
  batch_limit INT DEFAULT 100
)
RETURNS TABLE (id UUID, name TEXT, enriched_at TIMESTAMPTZ, last_checked_at TIMESTAMPTZ, google_place_id TEXT) AS $$
  SELECT s.id, s.name, s.enriched_at, s.last_checked_at, s.google_place_id
  FROM shops s
  WHERE s.processing_status = 'live'
    AND s.enriched_at IS NOT NULL
    AND s.enriched_at < now() - make_interval(days => days_threshold)
    AND (s.last_checked_at IS NULL
         OR s.last_checked_at < now() - make_interval(days => 1))
  ORDER BY s.enriched_at ASC
  LIMIT batch_limit;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
