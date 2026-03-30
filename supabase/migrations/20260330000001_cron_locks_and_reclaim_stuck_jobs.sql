-- Idempotency locks for cron jobs — prevents double-fire after dyno restart
CREATE TABLE cron_locks (
  job_name     TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_name, window_start)
);

-- Enable RLS but allow service_role full access (no user-facing reads)
ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;

-- Reclaim jobs stuck in 'claimed' status beyond a timeout.
-- Called by the in-process reaper every 5 minutes.
-- Returns: reclaimed_count (reset to pending) and failed_count (retries exhausted).
CREATE OR REPLACE FUNCTION reclaim_stuck_jobs(p_timeout_minutes INT DEFAULT 10)
RETURNS TABLE(reclaimed_count BIGINT, failed_count BIGINT) AS $$
DECLARE
  v_reclaimed BIGINT;
  v_failed    BIGINT;
BEGIN
  -- Reset reclaimable jobs to pending
  WITH reclaimed AS (
    UPDATE job_queue
    SET status       = 'pending',
        claimed_at   = NULL,
        scheduled_at = now()
    WHERE status = 'claimed'
      AND claimed_at < now() - make_interval(mins => p_timeout_minutes)
      AND attempts < max_attempts
    RETURNING id
  )
  SELECT COUNT(*) INTO v_reclaimed FROM reclaimed;

  -- Mark exhausted-retry jobs as failed
  WITH failed AS (
    UPDATE job_queue
    SET status     = 'failed',
        last_error = 'Reclaimed by stuck-job reaper: retries exhausted'
    WHERE status = 'claimed'
      AND claimed_at < now() - make_interval(mins => p_timeout_minutes)
      AND attempts >= max_attempts
    RETURNING id
  )
  SELECT COUNT(*) INTO v_failed FROM failed;

  RETURN QUERY SELECT v_reclaimed, v_failed;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;
