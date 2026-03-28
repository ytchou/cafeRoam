-- Create claim-proofs storage bucket (private, service-role access only).
-- Proof photos uploaded via service-role signed URLs; no user-facing RLS policies needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-proofs', 'claim-proofs', false);
