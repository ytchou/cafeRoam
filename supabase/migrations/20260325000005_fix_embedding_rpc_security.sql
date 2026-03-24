-- 20260325000005_fix_embedding_rpc_security.sql
-- Recreate the three check-in embedding RPCs with SECURITY DEFINER + pinned search_path
-- (matching the codebase-wide convention for all data-access RPCs) and VOLATILE instead
-- of STABLE (these functions reflect real-time DB state; STABLE would allow Postgres to
-- cache results within a transaction, which could cause stale reads in future test fixtures
-- or transactional wrappers).
--
-- Note: find_shops_needing_review_reembed includes a `last_embedded_at IS NULL` branch as a
-- safety net for shops that may have missed the backfill in migration 20260325000001.
-- After handle_generate_embedding runs for a shop it sets last_embedded_at, so that shop
-- exits this query on the next nightly run. Shops whose embedding jobs fail persistently are
-- bounded by max_attempts=3 in the job queue before moving to dead_letter.

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
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;


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
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;


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
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;
