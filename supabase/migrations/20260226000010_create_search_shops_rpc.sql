-- search_shops: pgvector cosine similarity with optional mode and geo pre-filters.
--
-- Parameters:
--   query_embedding       The query vector (1536-dim, from text-embedding-3-small)
--   match_count           Max rows to return (default 20)
--   filter_mode_field     Optional: "mode_work" | "mode_rest" | "mode_social"
--   filter_mode_threshold Optional: minimum mode score required (default 0.4)
--   filter_lat/lng        Optional: centre point for geo pre-filter
--   filter_radius_km      Optional: radius for geo pre-filter (default 5.0 km)
--
-- Returns all Shop model fields + photo_urls, tag_ids (for taxonomy boost), similarity.

CREATE OR REPLACE FUNCTION search_shops(
    query_embedding vector(1536),
    match_count      int     DEFAULT 20,
    filter_mode_field     text    DEFAULT NULL,
    filter_mode_threshold float   DEFAULT 0.4,
    filter_lat       float   DEFAULT NULL,
    filter_lng       float   DEFAULT NULL,
    filter_radius_km float   DEFAULT 5.0
)
RETURNS TABLE (
    id              uuid,
    name            text,
    address         text,
    latitude        double precision,
    longitude       double precision,
    mrt             text,
    phone           text,
    website         text,
    opening_hours   jsonb,
    rating          numeric,
    review_count    integer,
    price_range     text,
    description     text,
    menu_url        text,
    cafenomad_id    text,
    google_place_id text,
    created_at      timestamptz,
    updated_at      timestamptz,
    photo_urls      text[],
    tag_ids         text[],
    similarity      float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT
        s.id,
        s.name,
        s.address,
        s.latitude,
        s.longitude,
        s.mrt,
        s.phone,
        s.website,
        s.opening_hours,
        s.rating,
        s.review_count,
        s.price_range,
        s.description,
        s.menu_url,
        s.cafenomad_id,
        s.google_place_id,
        s.created_at,
        s.updated_at,
        COALESCE(
            ARRAY(SELECT url FROM shop_photos WHERE shop_id = s.id ORDER BY sort_order),
            '{}'
        ) AS photo_urls,
        COALESCE(
            ARRAY(SELECT tag_id::text FROM shop_tags WHERE shop_id = s.id),
            '{}'
        ) AS tag_ids,
        1 - (s.embedding <=> query_embedding) AS similarity
    FROM shops s
    WHERE
        s.processing_status = 'live'
        AND s.embedding IS NOT NULL
        -- Mode pre-filter: require the specified mode score >= threshold
        AND (
            filter_mode_field IS NULL
            OR CASE filter_mode_field
                WHEN 'mode_work'   THEN s.mode_work
                WHEN 'mode_rest'   THEN s.mode_rest
                WHEN 'mode_social' THEN s.mode_social
                ELSE NULL
            END >= filter_mode_threshold
        )
        -- Geo pre-filter: bounding box (1° lat ≈ 111 km, 1° lng ≈ 111 km × cos(lat))
        AND (
            filter_lat IS NULL
            OR (
                ABS(s.latitude  - filter_lat) <= filter_radius_km / 111.0
                AND ABS(s.longitude - filter_lng) <= filter_radius_km / (111.0 * COS(RADIANS(filter_lat)))
            )
        )
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count;
$$;
