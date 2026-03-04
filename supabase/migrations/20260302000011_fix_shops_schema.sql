-- Add google_maps_url column used by importers to store the constructed Maps search URL.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Extend processing_status constraint to include pipeline statuses used by importers.
-- DROP + re-ADD is required — PostgreSQL does not support ALTER CONSTRAINT.
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_processing_status_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_processing_status_check
    CHECK (processing_status = ANY (ARRAY[
        'pending'::text,
        'pending_url_check'::text,
        'pending_review'::text,
        'scraping'::text,
        'enriching'::text,
        'embedding'::text,
        'publishing'::text,
        'live'::text,
        'failed'::text,
        'filtered_dead_url'::text
    ]));
