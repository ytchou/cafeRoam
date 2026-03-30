-- Fix: make reclaim_stuck_jobs atomic (single UPDATE with CASE WHEN)
-- and add 60s backoff on reclaim to avoid immediate re-cycling of slow jobs.
-- Also add an explicit deny-all RLS policy on cron_locks for documentation clarity.

-- Deny all access from non-service roles (service_role bypasses RLS automatically).
-- This makes the intent explicit — cron_locks is internal, not user-facing.
CREATE POLICY "deny_all" ON cron_locks FOR ALL USING (false);

-- Replace the two-statement version with a single atomic UPDATE.
-- The original had two sequential CTEs: one to reset reclaimable jobs,
-- one to fail exhausted jobs. Between them a concurrent poller could
-- claim a freshly-reset row and have it re-failed incorrectly.
CREATE OR REPLACE FUNCTION reclaim_stuck_jobs(p_timeout_minutes INT DEFAULT 10)
RETURNS TABLE(reclaimed_count BIGINT, failed_count BIGINT) AS $$
  WITH stuck AS (
    SELECT id, attempts, max_attempts
    FROM job_queue
    WHERE status = 'claimed'
      AND claimed_at < now() - make_interval(mins => p_timeout_minutes)
  ),
  updated AS (
    UPDATE job_queue
    SET
      status       = CASE WHEN s.attempts < s.max_attempts THEN 'pending' ELSE 'failed' END,
      claimed_at   = CASE WHEN s.attempts < s.max_attempts THEN NULL     ELSE claimed_at END,
      -- 60s backoff on reclaim to avoid immediate re-cycling of genuinely slow jobs
      scheduled_at = CASE WHEN s.attempts < s.max_attempts
                          THEN now() + interval '60 seconds'
                          ELSE scheduled_at END,
      last_error   = CASE WHEN s.attempts >= s.max_attempts
                          THEN 'Reclaimed by stuck-job reaper: retries exhausted'
                          ELSE last_error END
    FROM stuck s
    WHERE job_queue.id = s.id
    RETURNING CASE WHEN s.attempts < s.max_attempts THEN 1 ELSE 0 END AS was_reclaimed
  )
  SELECT
    COUNT(*) FILTER (WHERE was_reclaimed = 1) AS reclaimed_count,
    COUNT(*) FILTER (WHERE was_reclaimed = 0) AS failed_count
  FROM updated;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;
