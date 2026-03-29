-- Create claim-proofs storage bucket (private, service-role access only).
-- Proof photos uploaded via service-role signed URLs and accessed by admin only.
--
-- No storage.objects RLS policies are added intentionally: with Supabase RLS enabled
-- by default, authenticated tokens cannot access objects without an explicit allow
-- policy. All access goes via the service-role client in the backend.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-proofs',
  'claim-proofs',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);
