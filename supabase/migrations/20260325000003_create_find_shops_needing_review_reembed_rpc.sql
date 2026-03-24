-- 20260325000003_create_find_shops_needing_review_reembed_rpc.sql
-- Find live shops that have check-in text added after their last embedding.
-- Used by the nightly REEMBED_REVIEWED_SHOPS cron job.
CREATE OR REPLACE FUNCTION find_shops_needing_review_reembed(
  p_min_text_length INT DEFAULT 15
)
RETURNS TABLE (id UUID) AS $$
  SELECT DISTINCT s.id
  FROM shops s
  INNER JOIN check_ins c ON c.shop_id = s.id
  WHERE s.processing_status = 'live'
    AND s.embedding IS NOT NULL
    AND (
      s.last_embedded_at IS NULL
      OR c.created_at > s.last_embedded_at
    )
    AND (
      LENGTH(COALESCE(c.note, '')) >= p_min_text_length
      OR LENGTH(COALESCE(c.review_text, '')) >= p_min_text_length
    );
$$ LANGUAGE sql STABLE;
