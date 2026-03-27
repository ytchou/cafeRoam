CREATE TABLE review_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id  UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id),
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checkin_id)
);

ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Owner can manage their responses
CREATE POLICY "owner_manage_responses" ON review_responses
  FOR ALL USING (owner_id = auth.uid());

-- Anyone can read responses
CREATE POLICY "public_read_responses" ON review_responses
  FOR SELECT USING (true);

CREATE INDEX idx_review_responses_shop_id ON review_responses(shop_id);
CREATE INDEX idx_review_responses_checkin_id ON review_responses(checkin_id);
