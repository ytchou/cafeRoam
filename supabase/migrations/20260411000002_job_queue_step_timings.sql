-- Add per-step timing data to job_queue for pipeline observability
ALTER TABLE job_queue
  ADD COLUMN IF NOT EXISTS step_timings JSONB;
