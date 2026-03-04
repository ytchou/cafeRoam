-- Taxonomy v4: coffee sourcing tags
--
-- Splits fair trade (sourcing certification) out of sustainable_fair_trade,
-- and adds small-farm direct sourcing (小農) as a distinct concept.
--
-- Note: 烘豆 is already covered by self_roasted (coffee) — not added here.
--
-- Also corrects sustainable_fair_trade label/aliases (was conflating two concepts).

-- Fix sustainable_fair_trade: strip fair-trade aliases, make it purely eco/environmental
UPDATE taxonomy_tags
SET
  label    = 'Eco-Conscious / Sustainable',
  label_zh = '永續環保咖啡廳',
  aliases  = ARRAY['永續', '環保', '友善環境', '減塑', '環境友善', '零浪費', '綠色咖啡廳',
                   'sustainable', 'eco-friendly', 'eco-conscious', 'zero waste', 'green cafe']
WHERE id = 'sustainable_fair_trade';

-- Add fair trade and small-farm direct as distinct coffee sourcing tags
INSERT INTO taxonomy_tags (id, dimension, label, label_zh, aliases) VALUES

  ('fair_trade', 'coffee',
    'Fair Trade Certified',
    '公平貿易認證',
    ARRAY['公平貿易', '公平交易', '公平貿易咖啡', '認證', '公平貿易認證',
          'fair trade', 'fairtrade', 'fair-trade', 'certified', 'FLO']),

  ('small_farm_direct', 'coffee',
    'Small-Farm Direct Sourcing',
    '小農直送',
    ARRAY['小農', '小農直送', '小農咖啡', '小農合作', '農場直送', '直接採購', '在地小農',
          '產地直送', '台灣小農', 'small farm', 'farm direct', 'direct sourcing',
          'smallholder', '小規模農場'])

ON CONFLICT (id) DO NOTHING;
