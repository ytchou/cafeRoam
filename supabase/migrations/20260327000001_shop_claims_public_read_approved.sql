-- Allow anon/public clients to see the status of approved claims.
-- This enables the verified badge to render for unauthenticated visitors on shop detail pages.
-- Only 'approved' rows are visible; pending/rejected claims remain private.
CREATE POLICY "public read approved claim status"
  ON public.shop_claims FOR SELECT
  USING (status = 'approved');
