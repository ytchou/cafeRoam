-- These columns were added to the local DB without migrations,
-- causing staging to fail enrichment jobs (column does not exist).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS categories   text[]  NOT NULL DEFAULT '{}';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS socket       text;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS limited_time text;
