-- Add new vibe, functionality, and coffee taxonomy tags (Wave 1B expansion)
INSERT INTO taxonomy_tags (id, dimension, label, label_zh) VALUES
  ('natural_light',    'functionality', 'Natural Light',                    '自然光充足'),
  ('private_rooms',    'functionality', 'Private Rooms / Partitions',       '有包廂/隔間'),
  ('window_seats',     'functionality', 'Window Seats',                     '窗邊座位'),
  ('large_tables',     'functionality', 'Large / Communal Tables',          '大桌/共享桌'),
  ('second_floor',     'functionality', 'Second Floor / Multi-Level Space', '二樓/複層空間'),
  ('wenqing_literary',   'ambience',      'Wénqīng / Literary Aesthetic',     '文青風格'),
  ('healing_soothing',  'ambience',      'Healing / Soothing Vibe',          '療癒系'),
  ('retro_industrial',  'ambience',      'Retro Industrial',                 '復古工業風'),
  ('japanese_minimalist','ambience',     'Japanese Minimalist',              '日系簡約'),
  ('instagram_hotspot', 'ambience',      'Instagram Hotspot',                'IG打卡熱點'),
  ('old_house_renovated', 'ambience',   'Renovated Old House',              '老屋改建'),
  ('tropical_plants',  'ambience',      'Lush Greenery / Tropical Plants',  '綠意盎然'),
  ('rare_beans',       'coffee',        'Rare / Competition Beans',         '稀有豆/競標豆');
