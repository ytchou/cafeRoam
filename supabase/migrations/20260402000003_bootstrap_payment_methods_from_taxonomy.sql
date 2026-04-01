-- Shops with cash_only tag → {cash: true, card: false}
UPDATE shops AS s
SET payment_methods = '{"cash": true, "card": false}'::jsonb
FROM shop_tags AS st
WHERE st.shop_id = s.id
  AND st.tag_id = 'cash_only'
  AND (s.payment_methods IS NULL OR s.payment_methods = '{}'::jsonb);

-- Shops with mobile_payment tag → {line_pay: true}
UPDATE shops AS s
SET payment_methods = s.payment_methods || '{"line_pay": true}'::jsonb
FROM shop_tags AS st
WHERE st.shop_id = s.id
  AND st.tag_id = 'mobile_payment'
  AND (s.payment_methods IS NULL OR s.payment_methods = '{}'::jsonb
       OR NOT s.payment_methods ? 'line_pay');
