-- Store Google Maps physical features scraped from additionalInfo.
-- Used by enrich_shop to populate Track 3 (Physical Feature Tags).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_maps_features JSONB NOT NULL DEFAULT '{}';
