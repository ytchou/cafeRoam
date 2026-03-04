-- Taxonomy v3: Taiwan indie café culture tags
--
-- Research basis: 台灣獨立咖啡廳 community discussions (PTT, Dcard, Threads, travel blogs)
-- Adds 13 tags covering heritage architecture, music culture, social identity,
-- and hybrid space types specific to Taiwan's independent café scene.
--
-- Dimension: ambience (7) — space character and vibe
--   japanese_colonial_building, traditional_taiwanese_house, forest_style,
--   scenic_view, vinyl_listening_bar, ruin_aesthetic, select_shop_hybrid
--
-- Dimension: functionality (6) — policies, services, mission
--   lgbtq_friendly, live_music_events, rotating_exhibitions,
--   community_events, sustainable_fair_trade, stray_animal_adoption

INSERT INTO taxonomy_tags (id, dimension, label, label_zh, aliases) VALUES

  -- AMBIENCE: Heritage architecture
  ('japanese_colonial_building', 'ambience',
    'Japanese Colonial-Era Building',
    '日式老屋／昭和建築',
    ARRAY['日式老屋', '昭和', '昭和建築', '昭和咖啡廳', '日治建築', '檜木老屋', '日本老宅',
          'japanese colonial', 'japanese old house', 'showa era', 'hinoki']),

  ('traditional_taiwanese_house', 'ambience',
    'Traditional Taiwanese House',
    '古厝／三合院',
    ARRAY['古厝', '三合院', '老宅', '百年老宅', '傳統建築', '閩式建築', '老房子', '紅磚',
          'old house', 'traditional house', 'sanhe yuan', 'guchuo', '歷史建築']),

  -- AMBIENCE: Nature / greenery
  ('forest_style', 'ambience',
    'Forest Style / Urban Jungle',
    '森林系室內設計',
    ARRAY['森林系', '植栽系', '大量植物', '滿滿綠植', '室內植物', '多肉植物', '觀葉植物',
          'urban jungle', 'forest style', 'plant cafe', '植物咖啡廳', '綠意']),

  ('scenic_view', 'ambience',
    'Scenic View Café',
    '景觀咖啡廳',
    ARRAY['景觀', '山景', '海景', '稻田', '夜景', '田園', '山上', '海邊', '山景咖啡',
          '海景咖啡', '稻田咖啡', '夜景咖啡', '城市夜景', 'view cafe', 'scenic view',
          'mountain view', 'ocean view', 'rice paddy']),

  -- AMBIENCE: Music culture
  ('vinyl_listening_bar', 'ambience',
    'Vinyl / Hi-Fi Listening Bar',
    '黑膠聆聽咖啡廳',
    ARRAY['黑膠', '黑膠唱片', '黑膠咖啡廳', '黑膠咖啡', '高音質', '音響咖啡廳', '唱片行',
          'vinyl', 'hi-fi', 'hifi', 'listening bar', 'record cafe', 'turntable', '黑膠牆']),

  -- AMBIENCE: Unique space character
  ('ruin_aesthetic', 'ambience',
    'Repurposed Ruin / Abandoned Space',
    '廢墟改建空間',
    ARRAY['廢墟', '廢棄', '老倉庫', '廢棄工廠', '廢棄空間改建', '舊倉庫', '老工廠',
          'ruins', 'abandoned', 'ruin cafe', 'repurposed', '廢墟咖啡']),

  ('select_shop_hybrid', 'ambience',
    'Select Shop Hybrid (選物)',
    '選物咖啡廳',
    ARRAY['選物', '選物店', '生活選品', '選品', '生活風格', '複合式空間', '選物咖啡廳',
          'select shop', 'lifestyle store', 'curated goods', '選物販售', '設計選品']),

  -- FUNCTIONALITY: Social identity
  ('lgbtq_friendly', 'functionality',
    'LGBTQ+-Friendly',
    'LGBTQ+ 友善',
    ARRAY['LGBTQ', 'LGBT', '性別友善', '性少數友善', '彩虹', '同志友善', '友善空間',
          'lgbtq friendly', 'queer friendly', 'pride', 'rainbow', 'inclusive']),

  -- FUNCTIONALITY: Live programming
  ('live_music_events', 'functionality',
    'Live Music / Gig Events',
    '現場音樂展演',
    ARRAY['現場音樂', '小型演唱會', '展演', '音樂演出', '樂團表演', '現場演出', '現場表演',
          'live music', 'gig', 'live performance', 'indie concert', '音樂展演空間']),

  ('rotating_exhibitions', 'functionality',
    'Rotating Art Exhibitions',
    '定期藝術展覽',
    ARRAY['定期展覽', '輪替展覽', '藝術展', '攝影展', '定期換展', '展覽活動', '不定期展覽',
          'rotating exhibition', 'rotating gallery', 'art exhibition', 'photo exhibition']),

  ('community_events', 'functionality',
    'Community Events / Workshops',
    '社區活動空間',
    ARRAY['工作坊', '電影放映', '座談', '語言交換', '社區活動', '讀書會', '分享會', '講座',
          'workshop', 'film screening', 'language exchange', 'talk', 'event space', '活動策展']),

  -- FUNCTIONALITY: Mission / values
  ('sustainable_fair_trade', 'functionality',
    'Eco-Conscious / Sustainable',
    '永續環保咖啡廳',
    ARRAY['永續', '環保', '友善環境', '減塑', '環境友善', '零浪費', '綠色咖啡廳',
          'sustainable', 'eco-friendly', 'eco-conscious', 'zero waste', 'green cafe']),

  ('stray_animal_adoption', 'functionality',
    'Stray Animal Adoption Café',
    '浪浪認養咖啡廳',
    ARRAY['浪浪', '認養', '流浪貓', '流浪狗', '送養', '浪浪咖啡廳', '動物救援', '愛護動物',
          'adoption cafe', 'rescue animals', 'stray cat', 'stray dog', 'foster cafe'])

ON CONFLICT (id) DO NOTHING;
