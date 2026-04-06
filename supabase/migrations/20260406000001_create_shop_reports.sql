-- Shop data reports: users flag incorrect shop information
CREATE TABLE shop_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  field       TEXT,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'sent_to_linear', 'resolved')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_reports_status_reported
  ON shop_reports(status, reported_at);
CREATE INDEX idx_shop_reports_shop_id
  ON shop_reports(shop_id);

ALTER TABLE shop_reports ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit a report
CREATE POLICY "Anyone can insert reports"
  ON shop_reports FOR INSERT
  WITH CHECK (true);

-- No SELECT for regular users — admin uses service role (bypasses RLS)
-- No UPDATE/DELETE for regular users
