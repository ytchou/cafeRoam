-- Single-query discovery of job types with pending work.
-- Used by the consolidated scheduler poller to avoid fetching all pending rows
-- just to find distinct job_type values.
CREATE OR REPLACE FUNCTION get_pending_job_types()
RETURNS TABLE(job_type TEXT) AS $$
  SELECT DISTINCT job_type FROM job_queue
  WHERE status = 'pending'
    AND scheduled_at <= now()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
