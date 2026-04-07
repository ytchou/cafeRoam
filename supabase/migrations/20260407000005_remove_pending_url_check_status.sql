-- Remove 'pending_url_check' from shops.processing_status constraint
-- This stage is dead: admin dashboard seeds shops directly as 'pending',
-- bypassing URL validation entirely. Legacy importers removed in DEV-292.
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_processing_status_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_processing_status_check
    CHECK (processing_status IN (
        'pending', 'pending_review',
        'scraping', 'enriching', 'embedding', 'publishing',
        'live', 'failed', 'out_of_region', 'rejected',
        'filtered_dead_url', 'timed_out'
    ));
