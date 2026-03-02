-- tagged_shop_count(): returns COUNT(DISTINCT shop_id) from shop_tags.
-- Replaces the Python-side row-fetch-and-deduplicate approach in admin_taxonomy,
-- which was vulnerable to PostgREST server-side max_rows truncation.
CREATE OR REPLACE FUNCTION tagged_shop_count()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COUNT(DISTINCT shop_id) FROM shop_tags;
$$;

-- Public read is intentional (aggregate only, no PII).
