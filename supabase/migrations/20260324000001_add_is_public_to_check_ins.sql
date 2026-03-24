-- Add is_public flag to check_ins for community feed visibility
ALTER TABLE check_ins ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- Backfill: all existing check-ins become public
-- (The DEFAULT true handles this for rows inserted after the migration,
--  but existing rows with NOT NULL + DEFAULT are set immediately by Postgres.)

-- Partial index for feed queries — only indexes public check-ins
CREATE INDEX idx_check_ins_public_feed
  ON check_ins(created_at DESC)
  WHERE is_public = true;

-- RLS: any authenticated user can read public check-ins
-- (Existing check_ins_own_read policy still allows users to read their own private check-ins)
CREATE POLICY "check_ins_public_read" ON check_ins
  FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

-- RLS: allow authenticated users to read any profile (for community feed author display)
-- (Existing profiles_own_read still allows users to read their own profile)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS: allow reading user_roles for badge display (currently no RLS policy exists)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_public_read" ON user_roles
  FOR SELECT USING (true);
