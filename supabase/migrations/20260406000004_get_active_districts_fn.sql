-- Live-count function for districts — replaces stale shop_count column as the filter.
-- Returns only active districts that currently have >= min_shops live shops.
CREATE OR REPLACE FUNCTION get_active_districts(min_shops int DEFAULT 3)
RETURNS TABLE (
  id            uuid,
  slug          text,
  name_en       text,
  name_zh       text,
  description_en text,
  description_zh text,
  city          text,
  shop_count    bigint,
  sort_order    int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    d.id,
    d.slug,
    d.name_en,
    d.name_zh,
    d.description_en,
    d.description_zh,
    d.city,
    COUNT(s.id) AS shop_count,
    d.sort_order
  FROM districts d
  LEFT JOIN shops s ON s.district_id = d.id AND s.processing_status = 'live'
  WHERE d.is_active = true
  GROUP BY d.id
  HAVING COUNT(s.id) >= min_shops
  ORDER BY d.sort_order;
$$;

GRANT EXECUTE ON FUNCTION get_active_districts(int) TO anon, authenticated;
