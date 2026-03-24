-- 20260325000002_create_get_ranked_checkin_texts_rpc.sql
-- Returns the top N check-in texts for a shop, ranked by:
--   1. Like count (most liked first)
--   2. Text quality (≥100 chars prioritized)
--   3. Recency (newest first)
-- Minimum text length filter eliminates noise.
CREATE OR REPLACE FUNCTION get_ranked_checkin_texts(
  p_shop_id UUID,
  p_min_length INT DEFAULT 15,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (text TEXT) AS $$
  SELECT
    TRIM(COALESCE(c.review_text, '') || ' ' || COALESCE(c.note, '')) AS text
  FROM check_ins c
  LEFT JOIN (
    SELECT checkin_id, COUNT(*) AS like_count
    FROM community_note_likes
    GROUP BY checkin_id
  ) l ON l.checkin_id = c.id
  WHERE c.shop_id = p_shop_id
    AND (
      LENGTH(COALESCE(c.note, '')) >= p_min_length
      OR LENGTH(COALESCE(c.review_text, '')) >= p_min_length
    )
  ORDER BY
    l.like_count DESC NULLS LAST,
    CASE
      WHEN LENGTH(COALESCE(c.review_text, '') || COALESCE(c.note, '')) >= 100 THEN 0
      ELSE 1
    END,
    c.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
