-- DEV-297: cold-start preference onboarding
-- Adds 5 nullable columns to profiles to capture first-session preferences.

ALTER TABLE profiles
  ADD COLUMN preferred_modes text[] DEFAULT NULL,
  ADD COLUMN preferred_vibes text[] DEFAULT NULL,
  ADD COLUMN onboarding_note text DEFAULT NULL,
  ADD COLUMN preferences_completed_at timestamptz DEFAULT NULL,
  ADD COLUMN preferences_prompted_at  timestamptz DEFAULT NULL;

ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_modes_valid
  CHECK (
    preferred_modes IS NULL
    OR preferred_modes <@ ARRAY['work','rest','social']::text[]
  );

ALTER TABLE profiles ADD CONSTRAINT profiles_onboarding_note_len
  CHECK (onboarding_note IS NULL OR char_length(onboarding_note) <= 280);

COMMENT ON COLUMN profiles.preferred_modes IS 'Cold-start mode preference: subset of {work, rest, social}';
COMMENT ON COLUMN profiles.preferred_vibes IS 'Cold-start vibe preference: slugs from vibe_collections';
COMMENT ON COLUMN profiles.onboarding_note IS 'Optional free-text from preference onboarding step 3';
COMMENT ON COLUMN profiles.preferences_completed_at IS 'Set when user submits preferences';
COMMENT ON COLUMN profiles.preferences_prompted_at IS 'Set when user dismisses the preferences modal';
