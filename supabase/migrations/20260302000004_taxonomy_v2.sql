-- Taxonomy v2: fix redundancies, expand coffee dimension, add accessibility/language tags
--
-- Changes:
--   REMOVE: store_cat (functionality) — merged into has_cats (ambience)
--   REMOVE: roastery_onsite (functionality) — merged into self_roasted (coffee)
--   MODIFY: wenqing — English label updated to "Artsy / Indie Aesthetic"
--   MODIFY: has_cats — absorbs store_cat aliases
--   MODIFY: self_roasted — absorbs roastery_onsite aliases
--   ADD: wheelchair_accessible, english_friendly, credit_card_accepted, independent_cafe (functionality)
--   ADD: cold_brew, siphon, aeropress, taiwan_origin, tea_latte (coffee)

-- 1. Remove redundant tags (cascades to shop_tags automatically)
DELETE FROM taxonomy_tags WHERE id IN ('store_cat', 'roastery_onsite');

-- 2. Rename wenqing to internationally legible label
UPDATE taxonomy_tags
SET
  label   = 'Artsy / Indie Aesthetic',
  aliases = ARRAY['文青', 'indie', 'artsy', 'hipster', 'wénqīng', 'wenqing']
WHERE id = 'wenqing';

-- 3. Absorb store_cat aliases into has_cats
UPDATE taxonomy_tags
SET aliases = ARRAY['有貓', '貓', '貓咪', 'cat', 'cats', '店貓', '有店貓', 'store cat', 'resident cat']
WHERE id = 'has_cats';

-- 4. Absorb roastery_onsite aliases into self_roasted
UPDATE taxonomy_tags
SET aliases = ARRAY['自烘', '自家烘', '烘豆', '現場烘豆', 'house roast', 'self roast', 'roastery', 'roast on-site']
WHERE id = 'self_roasted';

-- 5. Add new functionality tags
INSERT INTO taxonomy_tags (id, dimension, label, label_zh, aliases) VALUES
  ('wheelchair_accessible', 'functionality', 'Wheelchair Accessible',    '無障礙空間',   ARRAY['無障礙', '輪椅', 'accessible', 'wheelchair', '殘障友善', '無障礙廁所']),
  ('english_friendly',      'functionality', 'English-Friendly',         '英文服務友善', ARRAY['英文菜單', '英文', 'english menu', 'english friendly', '外國人友善', 'foreigner friendly']),
  ('credit_card_accepted',  'functionality', 'Credit Card Accepted',     '接受信用卡',   ARRAY['信用卡', '刷卡', 'credit card', 'visa', 'mastercard', '可刷卡']),
  ('independent_cafe',      'functionality', 'Independent Café',         '獨立咖啡廳',   ARRAY['獨立', '非連鎖', '個人咖啡廳', 'independent', 'no chain', 'indie cafe', '獨立店'])
ON CONFLICT (id) DO NOTHING;

-- 6. Add new coffee tags
INSERT INTO taxonomy_tags (id, dimension, label, label_zh, aliases) VALUES
  ('cold_brew',     'coffee', 'Cold Brew',              '冷萃咖啡',   ARRAY['冷萃', '冰滴', 'cold brew', 'cold drip', '氮氣冷萃', 'nitro cold brew', 'nitro']),
  ('siphon',        'coffee', 'Siphon Coffee',          '虹吸式咖啡', ARRAY['虹吸', 'siphon', 'vacuum pot', '塞風', '虹吸壺']),
  ('aeropress',     'coffee', 'AeroPress',              '愛樂壓咖啡', ARRAY['愛樂壓', 'aeropress', 'Aeropress', 'aero press']),
  ('taiwan_origin', 'coffee', 'Taiwan-Origin Coffee',   '台灣產地咖啡', ARRAY['台灣咖啡', '台灣豆', '阿里山咖啡', '台東咖啡', '古坑咖啡', 'taiwan coffee', 'local origin', 'taiwanese origin']),
  ('tea_latte',     'coffee', 'Signature Tea / Tea Latte', '特色茶飲', ARRAY['茶拿鐵', '台茶', '抹茶拿鐵', '烏龍茶拿鐵', '奶茶', 'tea latte', 'matcha latte', 'tea', 'milk tea'])
ON CONFLICT (id) DO NOTHING;
