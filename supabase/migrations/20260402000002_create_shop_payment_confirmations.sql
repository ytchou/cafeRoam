CREATE TABLE shop_payment_confirmations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method     TEXT NOT NULL
             CHECK (method IN ('cash','card','line_pay','twqr','apple_pay','google_pay')),
  vote       BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, user_id, method)
);

CREATE INDEX idx_spc_shop_id ON shop_payment_confirmations(shop_id);
CREATE INDEX idx_spc_user_id ON shop_payment_confirmations(user_id);

ALTER TABLE shop_payment_confirmations ENABLE ROW LEVEL SECURITY;

-- Anyone can read all confirmations
CREATE POLICY "Anyone can read confirmations"
  ON shop_payment_confirmations FOR SELECT
  USING (true);

-- Authenticated users can insert their own
CREATE POLICY "Users can insert own confirmations"
  ON shop_payment_confirmations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own
CREATE POLICY "Users can update own confirmations"
  ON shop_payment_confirmations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own
CREATE POLICY "Users can delete own confirmations"
  ON shop_payment_confirmations FOR DELETE
  USING (auth.uid() = user_id);
