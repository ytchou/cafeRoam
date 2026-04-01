-- Add payment_methods JSONB to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}';

COMMENT ON COLUMN shops.payment_methods IS
  'Structured payment method data: {cash, card, line_pay, twqr, apple_pay, google_pay} → true/false/null';
