-- RPC function for atomic job claiming (used by workers via supabase.rpc)
CREATE OR REPLACE FUNCTION claim_job(p_job_type TEXT DEFAULT NULL)
RETURNS SETOF job_queue AS $$
  UPDATE job_queue
  SET status = 'claimed',
      claimed_at = now(),
      attempts = attempts + 1
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (p_job_type IS NULL OR job_type = p_job_type)
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;
