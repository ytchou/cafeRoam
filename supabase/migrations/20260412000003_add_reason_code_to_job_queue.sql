-- Add reason_code column with CHECK constraint (TEXT + CHECK, matching JobStatus pattern)
ALTER TABLE job_queue
  ADD COLUMN reason_code TEXT
    CHECK (reason_code IN (
      'operator_cancelled',
      'retry_exhausted',
      'bad_input',
      'timeout',
      'dependency_failed',
      'provider_error'
    ));

-- Best-effort backfill existing terminal rows
-- NOTE: cancelled status was added in 20260410000001; existing cancelled rows get operator_cancelled
UPDATE job_queue
SET reason_code = 'operator_cancelled'
WHERE status = 'cancelled' AND reason_code IS NULL;

-- NOTE: queue.fail() uses JobStatus.FAILED (not dead_letter) for exhausted retries
UPDATE job_queue
SET reason_code = 'retry_exhausted'
WHERE status = 'failed' AND reason_code IS NULL;
