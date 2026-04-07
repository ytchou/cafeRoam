-- Add compound cafe (複合式咖啡) taxonomy tags to the functionality dimension
INSERT INTO taxonomy_tags (id, dimension, label, label_zh) VALUES
  ('pop_up_host',       'functionality', 'Pop-up Host',       '快閃活動承辦'),
  ('retail_goods',      'functionality', 'Retail Goods',      '選品販售'),
  ('craft_workshop',    'functionality', 'Craft Workshop',    '手作課程'),
  ('dining_restaurant', 'functionality', 'Dining Restaurant', '正餐供應');
