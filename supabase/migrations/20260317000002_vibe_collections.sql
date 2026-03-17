-- supabase/migrations/20260317000002_vibe_collections.sql
-- Vibe Collections: curated editorial presets combining existing taxonomy tags.
-- Read-only public table — no RLS required.

CREATE TABLE IF NOT EXISTS public.vibe_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  name_zh     TEXT NOT NULL,
  emoji       TEXT,
  subtitle    TEXT,
  subtitle_zh TEXT,
  tag_ids     TEXT[] NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_vibe_collections_active
  ON public.vibe_collections (sort_order)
  WHERE is_active = true;

-- Seed: 10 curated vibes built from existing taxonomy tag IDs
INSERT INTO public.vibe_collections
  (slug, name, name_zh, emoji, subtitle, subtitle_zh, tag_ids, sort_order)
VALUES
  ('study-cave',     'Study Cave',     '讀書洞穴', '📚', 'Quiet · WiFi',          '安靜 · 有網路',    ARRAY['quiet','laptop_friendly','wifi_available','no_time_limit'], 1),
  ('first-date',     'First Date',     '約會聖地', '💕', 'Cozy · Pretty',          '舒適 · 好拍',      ARRAY['cozy','photogenic','soft_lighting','small_intimate'],       2),
  ('deep-work',      'Deep Work',      '專注工作', '⚡', 'Focus · Power',          '專注 · 插座',      ARRAY['laptop_friendly','power_outlets','no_time_limit','quiet'],  3),
  ('espresso-nerd',  'Espresso Nerd',  '咖啡控',   '☕', 'Single-origin · Craft',  '單品 · 職人',      ARRAY['specialty_coffee_focused','self_roasted','pour_over','espresso_focused'], 4),
  ('hidden-gem',     'Hidden Gem',     '隱藏版',   '💎', 'Off the map · Indie',    '低調 · 獨立',      ARRAY['hidden_gem','alley_cafe','wenqing'],                        5),
  ('weekend-brunch', 'Weekend Brunch', '週末早午餐','🍳', 'Lazy · Social',          '悠閒 · 熱鬧',      ARRAY['food_menu','brunch_hours','lively','weekend_only'],         6),
  ('late-night-owl', 'Late Night Owl', '夜貓基地', '🌙', 'Open late · Vibe',       '深夜 · 氣氛',      ARRAY['late_night','open_evenings','good_music','lively'],         7),
  ('cat-cafe',       'Cat Café',       '貓咪咖啡', '🐱', 'Cats · Cozy',            '貓貓 · 舒適',      ARRAY['has_cats','store_cat','cozy'],                              8),
  ('slow-morning',   'Slow Morning',   '慢慢來',   '🌅', 'Early · Quiet',          '早起 · 安靜',      ARRAY['early_bird','slow_morning','quiet','soft_lighting'],        9),
  ('digital-nomad',  'Digital Nomad',  '遊牧工作者','💻', 'Plugged in · All day',   '插座 · 全天',      ARRAY['laptop_friendly','power_outlets','wifi_available','all_day','no_time_limit'], 10);
