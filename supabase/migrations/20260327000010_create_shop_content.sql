CREATE TABLE shop_content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  content_type  TEXT NOT NULL DEFAULT 'story'
                  CHECK (content_type IN ('story')),
  title         TEXT,
  body          TEXT NOT NULL,
  photo_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, content_type)
);

ALTER TABLE shop_content ENABLE ROW LEVEL SECURITY;

-- Owner can read/write their own content
CREATE POLICY "owner_manage_content" ON shop_content
  FOR ALL USING (owner_id = auth.uid());

-- Anyone can read published content (no auth required for shop story)
CREATE POLICY "public_read_published_content" ON shop_content
  FOR SELECT USING (is_published = true);

-- Index for fast lookup by shop
CREATE INDEX idx_shop_content_shop_id ON shop_content(shop_id);
