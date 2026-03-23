-- Taxonomy: add social_mixer and silent_work mode tags
--
-- Changes:
--   ADD: social_mixer (mode) — open-community energy, good for meeting strangers
--   ADD: silent_work (mode) — stricter than deep_work; signals no-talking social norm

INSERT INTO taxonomy_tags (id, dimension, label, label_zh, aliases) VALUES
  ('social_mixer', 'mode', 'Social Mixer',  '適合交友',   ARRAY['交友', '認識新朋友', '開放社交', 'social', 'meet people', 'community gathering', '社群', '交流']),
  ('silent_work',  'mode', 'Silent Work',   '只工作不講話', ARRAY['安靜工作', '禁止喧嘩', '無聲', 'silent', 'no talking', 'library quiet', '圖書館', '專注', '不適合聊天'])
ON CONFLICT (id) DO NOTHING;
