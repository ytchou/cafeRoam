-- shop_tag_counts: returns per-tag document frequency for IDF computation.
-- PostgREST cannot perform GROUP BY aggregations via .select("tag_id, count:count(*)"),
-- so this RPC provides the correct GROUP BY query.
CREATE OR REPLACE FUNCTION shop_tag_counts()
RETURNS TABLE (tag_id text, shop_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT tag_id::text, COUNT(*)::bigint AS shop_count
    FROM shop_tags
    GROUP BY tag_id;
$$;
