-- Add community summary columns to shops
ALTER TABLE shops ADD COLUMN community_summary TEXT;
ALTER TABLE shops ADD COLUMN community_summary_updated_at TIMESTAMPTZ;

-- Update job_type CHECK constraint to include all current job types + summarize_reviews
ALTER TABLE job_queue DROP CONSTRAINT IF EXISTS job_queue_job_type_check;
ALTER TABLE job_queue ADD CONSTRAINT job_queue_job_type_check
  CHECK (job_type IN (
    'enrich_shop', 'enrich_menu_photo', 'generate_embedding',
    'staleness_sweep', 'weekly_email',
    'scrape_shop', 'scrape_batch', 'publish_shop', 'admin_digest_email',
    'reembed_reviewed_shops', 'classify_shop_photos',
    'summarize_reviews'
  ));
