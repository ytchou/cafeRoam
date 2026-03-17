-- Add tarot enrichment fields to shops table.
-- Populated by the ENRICH_SHOP worker; queried by GET /explore/tarot-draw.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tarot_title TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS flavor_text TEXT;
