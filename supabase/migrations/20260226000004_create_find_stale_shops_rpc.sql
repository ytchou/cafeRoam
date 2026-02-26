CREATE OR REPLACE FUNCTION find_stale_shops(days_threshold INT DEFAULT 90)
RETURNS TABLE (id UUID, name TEXT, enriched_at TIMESTAMPTZ, last_checked_at TIMESTAMPTZ) AS $$
  SELECT s.id, s.name, s.enriched_at, s.last_checked_at
  FROM shops s
  WHERE s.processing_status = 'live'
    AND s.enriched_at IS NOT NULL
    AND s.enriched_at < now() - make_interval(days => days_threshold)
    AND (s.last_checked_at IS NULL
         OR s.last_checked_at < now() - make_interval(days => 1))
  ORDER BY s.enriched_at ASC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
