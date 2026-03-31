ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS menu_highlights  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coffee_origins   text[] DEFAULT '{}';
