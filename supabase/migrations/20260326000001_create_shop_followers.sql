-- Shop followers: users follow shops for social proof + future broadcast notifications (DEV-20)
CREATE TABLE shop_followers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_shop_followers_shop_id ON shop_followers(shop_id);
CREATE INDEX idx_shop_followers_user_id ON shop_followers(user_id);

-- RLS: users manage their own follows; all rows publicly readable for aggregate count queries
ALTER TABLE shop_followers ENABLE ROW LEVEL SECURITY;

-- Anyone can read follower rows — API only surfaces aggregate counts, never raw user_ids
CREATE POLICY "Public can read follower rows"
  ON shop_followers FOR SELECT
  USING (true);

-- Users can follow shops
CREATE POLICY "Users can follow shops"
  ON shop_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow shops
CREATE POLICY "Users can unfollow shops"
  ON shop_followers FOR DELETE
  USING (auth.uid() = user_id);
