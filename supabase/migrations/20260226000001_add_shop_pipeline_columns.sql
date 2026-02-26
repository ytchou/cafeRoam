-- processing_status tracks where a shop is in the pipeline
ALTER TABLE shops ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'live'
  CHECK (processing_status IN (
    'pending', 'scraping', 'enriching', 'embedding', 'publishing', 'live', 'failed'
  ));

-- source tracks how the shop was added
ALTER TABLE shops ADD COLUMN source TEXT
  CHECK (source IN ('cafe_nomad', 'google_takeout', 'user_submission', 'manual'));

-- last_checked_at is set by smart staleness sweep when no new reviews found
ALTER TABLE shops ADD COLUMN last_checked_at TIMESTAMPTZ;
