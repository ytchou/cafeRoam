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

-- RLS: users manage their own follows; anyone can read aggregate counts
ALTER TABLE shop_followers ENABLE ROW LEVEL SECURITY;

-- Users can see their own follow rows (needed for is_following check)
CREATE POLICY "Users can view own follows"
  ON shop_followers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can follow shops
CREATE POLICY "Users can follow shops"
  ON shop_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow shops
CREATE POLICY "Users can unfollow shops"
  ON shop_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all follows (for count queries from unauthenticated users)
-- This is handled automatically by service_role bypassing RLS
