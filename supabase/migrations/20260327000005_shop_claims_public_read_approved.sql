-- Allow anon/public clients to see the status of approved claims.
-- This enables the verified badge to render for unauthenticated visitors on shop detail pages.
-- Only 'approved' rows are visible; pending/rejected claims remain private.
-- Renamed from 20260327000001 (duplicate version). DROP IF EXISTS for idempotency on local re-run.
DROP POLICY IF EXISTS "public read approved claim status" ON public.shop_claims;
CREATE POLICY "public read approved claim status"
  ON public.shop_claims FOR SELECT
  USING (status = 'approved');
