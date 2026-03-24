-- 20260325000001_add_last_embedded_at.sql
-- Track when each shop's embedding was last generated, so the nightly cron
-- can identify shops needing re-embedding after new check-in text arrives.
ALTER TABLE shops ADD COLUMN last_embedded_at TIMESTAMPTZ;

-- Backfill: shops with an embedding have already been embedded "now"
UPDATE shops SET last_embedded_at = now() WHERE embedding IS NOT NULL;

-- Index for the nightly cron query: find shops where check_ins.created_at > last_embedded_at
CREATE INDEX idx_shops_last_embedded_at ON shops (last_embedded_at)
  WHERE last_embedded_at IS NOT NULL;
