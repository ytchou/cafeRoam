-- Supplement seed: add payment_methods data to live shops
-- Run after shops_data.sql: make seed-shops (runs both automatically)
-- Covers 15 shops with varied payment method combinations typical of Taiwan cafes.

-- Cash only (traditional small shops)
UPDATE public.shops SET payment_methods = '{"cash": true}'::jsonb
WHERE id IN (
  'df8e539b-f5f8-451e-87bb-ebb417125176',  -- 感傷唱片行
  '955e5b04-61f2-464e-8d12-dc09ce083469'   -- 岟川
);

-- Cash + LINE Pay (very common in Taiwan)
UPDATE public.shops SET payment_methods = '{"cash": true, "line_pay": true}'::jsonb
WHERE id IN (
  '73c899da-66ad-48ec-b803-ae8589a1bffd',  -- 木下庵 Kino
  '6cf49720-e668-4050-8d64-3cc0c211a9fd'   -- 小尾巴咖啡
);

-- Cash + credit card
UPDATE public.shops SET payment_methods = '{"cash": true, "credit_card": true}'::jsonb
WHERE id IN (
  'f0ffdde4-be2b-4fbc-9f9c-b6925a7721b7',  -- Le Park Cafe
  '5853ca2a-54ca-48d2-bcbd-49edda006eb1'   -- 田野咖啡
);

-- Cash + credit card + LINE Pay
UPDATE public.shops SET payment_methods = '{"cash": true, "credit_card": true, "line_pay": true}'::jsonb
WHERE id IN (
  'ebc2a59c-09b8-481e-ae10-1bc5c0469e64',  -- Homey's cafe
  'f9764b67-1e98-4e13-856e-b1a56af4a8ef'   -- 熙岸珈琲所
);

-- Full digital payments (modern cafes)
UPDATE public.shops SET payment_methods = '{"cash": true, "credit_card": true, "line_pay": true, "jko_pay": true, "apple_pay": true}'::jsonb
WHERE id IN (
  '89dde5ee-cfea-4f52-81e1-10a54b518ac8',  -- Frankie Feels Good
  'bd4de31a-e7a7-424e-b87e-b7314e6811ef',  -- Hoto Cafe
  '2527c798-62b2-414c-bae8-7ee307f93886'   -- COMPTOIR潮洋行
);

-- Full suite including Google Pay
UPDATE public.shops SET payment_methods = '{"cash": true, "credit_card": true, "line_pay": true, "jko_pay": true, "apple_pay": true, "google_pay": true}'::jsonb
WHERE id IN (
  'a16d560d-d2ee-4de2-ab6e-6651feaa57a4',  -- Modern Mode & Modern Mode Cafe
  '98a82823-1754-4e7b-af85-b00437f84af2',  -- 2J CAFE
  '1477bb2a-e3ff-4216-86f6-8c0b606d29fa',  -- Belinda Coffee
  'a96f58b3-7b12-40e4-b1a1-e0f7e4ad14e6'   -- YEH COFFEE
);
