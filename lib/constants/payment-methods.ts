export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  line_pay: 'LINE Pay',
  twqr: 'TWQR',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
} as const;

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);
