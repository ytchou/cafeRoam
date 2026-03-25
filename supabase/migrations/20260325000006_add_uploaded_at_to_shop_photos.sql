-- Add uploaded_at to shop_photos for age-based filtering
ALTER TABLE shop_photos ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- Index for the classification worker: fetch unclassified photos per shop
CREATE INDEX IF NOT EXISTS idx_shop_photos_unclassified
    ON shop_photos (shop_id)
    WHERE category IS NULL;
