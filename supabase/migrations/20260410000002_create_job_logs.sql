CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES job_queue(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_logs_job_id_created_at_idx ON job_logs (job_id, created_at DESC);

-- RLS: deny all direct access (server-side service-role only)
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
-- No permissive policies = deny all by default
