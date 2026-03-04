-- Update shop_tag_counts to include avg_confidence and dimension (taxonomy category).
-- The design doc specifies these columns in the tag frequency table.
-- DROP required: PostgreSQL forbids changing return type via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS shop_tag_counts();
CREATE OR REPLACE FUNCTION shop_tag_counts()
RETURNS TABLE (tag_id text, shop_count bigint, avg_confidence numeric, dimension text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT
        st.tag_id::text,
        COUNT(*)::bigint AS shop_count,
        ROUND(AVG(st.confidence), 2) AS avg_confidence,
        tt.dimension
    FROM shop_tags st
    JOIN taxonomy_tags tt ON tt.id = st.tag_id
    GROUP BY st.tag_id, tt.dimension;
$$;

-- admin_search_shops: like search_shops but without the processing_status = 'live' filter.
-- Used by the admin search-rank endpoint so admins can validate ranking for shops
-- still in the pipeline (pending / enriching / scraped).
CREATE OR REPLACE FUNCTION admin_search_shops(
    query_embedding vector(1536),
    match_count int DEFAULT 50
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
    SELECT s.id, 1 - (s.embedding <=> query_embedding) AS similarity
    FROM shops s
    WHERE s.embedding IS NOT NULL
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- SECURITY DEFINER — revoke public execute so only service role can call directly.
REVOKE EXECUTE ON FUNCTION admin_search_shops(vector, int) FROM PUBLIC;
