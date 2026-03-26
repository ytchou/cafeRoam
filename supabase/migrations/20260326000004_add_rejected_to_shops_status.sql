-- Add 'rejected' to shops.processing_status constraint
-- Required by admin reject endpoint which sets processing_status = 'rejected'
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_processing_status_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_processing_status_check
    CHECK (processing_status IN (
        'pending', 'pending_url_check', 'pending_review',
        'scraping', 'enriching', 'embedding', 'publishing',
        'live', 'failed', 'out_of_region', 'rejected'
    ));
