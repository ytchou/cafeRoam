-- Efficient job count by status — single query instead of N+1
CREATE OR REPLACE FUNCTION job_queue_counts_by_status()
RETURNS TABLE (status TEXT, count BIGINT) AS $$
  SELECT status, COUNT(*) AS count
  FROM job_queue
  GROUP BY status;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
