-- Replace district_id FK on shops with a plain text district field.
-- city and district are now populated directly by persist_scraped_data()
-- from address string parsing, eliminating the reference table join.

ALTER TABLE shops ADD COLUMN IF NOT EXISTS district TEXT;

ALTER TABLE shops DROP COLUMN IF EXISTS district_id;
