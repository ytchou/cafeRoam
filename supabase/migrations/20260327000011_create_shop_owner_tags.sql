CREATE TABLE shop_owner_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL REFERENCES auth.users(id),
  tag        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, tag)
);

ALTER TABLE shop_owner_tags ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own tags
CREATE POLICY "owner_manage_tags" ON shop_owner_tags
  FOR ALL USING (owner_id = auth.uid());

-- Anyone can read owner tags (shown on shop detail with "confirmed" badge)
CREATE POLICY "public_read_owner_tags" ON shop_owner_tags
  FOR SELECT USING (true);

CREATE INDEX idx_shop_owner_tags_shop_id ON shop_owner_tags(shop_id);
