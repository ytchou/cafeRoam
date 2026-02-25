-- Add WITH CHECK to profiles_own_update to prevent backdating deletion_requested_at.
-- Without this, a user could directly call the Supabase REST API to set
-- deletion_requested_at to a date in the past, causing immediate hard deletion
-- on the next scheduler run and bypassing the 30-day grace period.
--
-- The API (service role) bypasses RLS and is unaffected.
-- Direct user-facing Supabase client calls are now constrained.
DROP POLICY "profiles_own_update" ON profiles;

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Allow clearing deletion_requested_at (cancellation)
      deletion_requested_at IS NULL
      -- Allow setting deletion_requested_at to approximately now (within 5 minutes for clock skew)
      OR deletion_requested_at >= now() - interval '5 minutes'
    )
  );
