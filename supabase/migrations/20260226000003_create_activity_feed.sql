CREATE TABLE activity_feed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'shop_added', 'check_in', 'list_created'
  )),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_feed_recent ON activity_feed (created_at DESC);
CREATE INDEX idx_activity_feed_shop ON activity_feed (shop_id);

-- RLS: activity feed is public read, system-only write
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_feed_select ON activity_feed
  FOR SELECT USING (true);
