-- Add 'timed_out' to shops.processing_status constraint
-- Required by hourly sweep cron which marks stuck shops as timed_out
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_processing_status_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_processing_status_check
    CHECK (processing_status IN (
        'pending', 'pending_url_check', 'pending_review',
        'scraping', 'enriching', 'embedding', 'publishing',
        'live', 'failed', 'out_of_region', 'rejected',
        'filtered_dead_url', 'timed_out'
    ));
