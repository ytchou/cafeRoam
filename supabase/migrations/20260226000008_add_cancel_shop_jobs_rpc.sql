-- Cancel pending/claimed jobs for a specific shop (used when rejecting a submission)
CREATE OR REPLACE FUNCTION cancel_shop_jobs(p_shop_id UUID, p_reason TEXT DEFAULT 'Cancelled')
RETURNS VOID AS $$
  UPDATE job_queue
  SET status = 'failed', last_error = p_reason
  WHERE status IN ('pending', 'claimed')
    AND payload->>'shop_id' = p_shop_id::text;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
