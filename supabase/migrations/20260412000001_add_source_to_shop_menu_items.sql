-- Add source attribution columns to shop_menu_items
-- source: 'photo' (from ENRICH_MENU_PHOTO) or 'review' (from ENRICH_SHOP)
-- source_photo_id: FK to shop_photos for photo-sourced items (NULL for review-sourced)

ALTER TABLE shop_menu_items
  ADD COLUMN source text NOT NULL DEFAULT 'photo' CHECK (source IN ('photo', 'review')),
  ADD COLUMN source_photo_id uuid REFERENCES shop_photos(id) ON DELETE SET NULL;

-- Index for dedup guard queries (check if photo already extracted)
CREATE INDEX idx_shop_menu_items_source_photo
  ON shop_menu_items (source_photo_id) WHERE source_photo_id IS NOT NULL;

-- Index for review-sourced cleanup (delete all review items for a shop)
CREATE INDEX idx_shop_menu_items_source
  ON shop_menu_items (shop_id, source);
