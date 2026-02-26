CREATE TABLE shop_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_maps_url TEXT NOT NULL,
  shop_id         UUID REFERENCES shops(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'live', 'failed')),
  failure_reason  TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_submissions_status ON shop_submissions (status);
CREATE INDEX idx_shop_submissions_user ON shop_submissions (submitted_by, created_at DESC);

-- RLS: users can only see their own submissions.
-- Public discovery of newly-added shops goes through activity_feed, which
-- already omits actor_id. Direct exposure of other users' submitted_by UUIDs
-- here would violate PDPA posture even though it is not an email address.
ALTER TABLE shop_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_submissions_select ON shop_submissions
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());

CREATE POLICY shop_submissions_insert ON shop_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());
