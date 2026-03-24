-- 20260325000004_create_find_shops_with_checkin_text_rpc.sql
-- Find all live shops that have any qualifying check-in text (for initial rollout script).
-- Unlike find_shops_needing_review_reembed, this ignores last_embedded_at — it finds ALL shops
-- with check-in text, not just those with NEW text.
CREATE OR REPLACE FUNCTION find_shops_with_checkin_text(
  p_min_text_length INT DEFAULT 15
)
RETURNS TABLE (id UUID, name TEXT) AS $$
  SELECT DISTINCT s.id, s.name
  FROM shops s
  INNER JOIN check_ins c ON c.shop_id = s.id
  WHERE s.processing_status = 'live'
    AND s.embedding IS NOT NULL
    AND (
      LENGTH(COALESCE(c.note, '')) >= p_min_text_length
      OR LENGTH(COALESCE(c.review_text, '')) >= p_min_text_length
    )
  ORDER BY s.name;
$$ LANGUAGE sql STABLE;
