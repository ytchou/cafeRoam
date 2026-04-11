-- Add threads_url column to shops table
-- instagram_url and facebook_url already exist (migration 20260406000003)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS threads_url text;
