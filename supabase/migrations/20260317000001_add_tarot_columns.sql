-- Add tarot enrichment fields to shops table.
-- Populated by the ENRICH_SHOP worker; queried by GET /explore/tarot-draw.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tarot_title TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS flavor_text TEXT;

-- Partial index for the tarot-draw query: lat/lng filter combined with
-- tarot_title IS NOT NULL and processing_status = 'live'.
CREATE INDEX IF NOT EXISTS idx_shops_tarot ON shops (latitude, longitude)
  WHERE tarot_title IS NOT NULL AND processing_status = 'live';
