-- Shop followers: users follow shops for social proof + future broadcast notifications (DEV-20)
-- Renamed from 20260326000001 (duplicate version). IF NOT EXISTS for idempotency on local re-run.
CREATE TABLE IF NOT EXISTS shop_followers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_followers_shop_id ON shop_followers(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_followers_user_id ON shop_followers(user_id);

-- RLS: users manage their own follows; all rows publicly readable for aggregate count queries
ALTER TABLE shop_followers ENABLE ROW LEVEL SECURITY;

-- Anyone can read follower rows — API only surfaces aggregate counts, never raw user_ids
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shop_followers' AND policyname = 'Public can read follower rows') THEN
    CREATE POLICY "Public can read follower rows" ON shop_followers FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shop_followers' AND policyname = 'Users can follow shops') THEN
    CREATE POLICY "Users can follow shops" ON shop_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shop_followers' AND policyname = 'Users can unfollow shops') THEN
    CREATE POLICY "Users can unfollow shops" ON shop_followers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
