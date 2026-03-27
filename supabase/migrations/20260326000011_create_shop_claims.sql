-- 20260326000011_create_shop_claims.sql
-- shop_claims: stores ownership verification requests from shop owners.
-- One active claim per shop (UNIQUE on shop_id).
-- Proof photos stored in Supabase Storage private bucket 'claim-proofs'.

CREATE TABLE public.shop_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  contact_name     TEXT NOT NULL,
  contact_email    TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  proof_photo_url  TEXT NOT NULL,
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

CREATE INDEX idx_shop_claims_user   ON public.shop_claims(user_id);
CREATE INDEX idx_shop_claims_status ON public.shop_claims(status)
  WHERE status = 'pending';

-- RLS: enabled, but most access goes via service role in the backend.
ALTER TABLE public.shop_claims ENABLE ROW LEVEL SECURITY;

-- Users can read their own claim.
CREATE POLICY "users read own claim"
  ON public.shop_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own claim (uniqueness constraint prevents duplicate active claims).
CREATE POLICY "users insert own claim"
  ON public.shop_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket: claim-proofs (private -- service role only).
-- Run this in the Supabase dashboard or via the storage API since
-- the SQL migration cannot create storage buckets.
-- Bucket config:
--   name: claim-proofs
--   public: false
--   file_size_limit: 10485760  (10 MB)
--   allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
