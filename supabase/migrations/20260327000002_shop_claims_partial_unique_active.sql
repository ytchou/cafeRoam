-- Replace the non-partial UNIQUE(shop_id) constraint with a partial unique index.
-- The original constraint permanently blocked re-submissions after a rejection.
-- The partial index enforces the real invariant: at most one active (pending/approved)
-- claim per shop, while allowing new submissions after a rejection is resolved.
ALTER TABLE public.shop_claims DROP CONSTRAINT shop_claims_shop_id_key;

CREATE UNIQUE INDEX shop_claims_shop_id_active
  ON public.shop_claims(shop_id)
  WHERE status IN ('pending', 'approved');
