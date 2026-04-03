-- DEV-203: Test seed data for 木下庵 Kino
-- Covers: check_ins, shop_menu_items, shop_payment_confirmations, review_responses, shop_followers
-- Actor: dev admin user (caferoam.tw@gmail.com)
-- Run: docker exec supabase_db_caferoam psql -U postgres -d postgres -f /path/to/kino_test_data.sql
-- Idempotent: uses ON CONFLICT DO NOTHING throughout

DO $$
DECLARE
  v_shop_id    uuid := '73c899da-66ad-48ec-b803-ae8589a1bffd';
  v_user_id    uuid := '00000000-0000-0000-0000-000000000001';
  v_checkin_1  uuid := 'a1000000-0000-0000-0000-000000000001';
  v_checkin_2  uuid := 'a1000000-0000-0000-0000-000000000002';
  v_checkin_3  uuid := 'a1000000-0000-0000-0000-000000000003';
BEGIN

  -- ── check_ins ─────────────────────────────────────────────────────────────
  -- 1. Public check-in with stars, review text, and a menu photo
  INSERT INTO public.check_ins
    (id, user_id, shop_id, photo_urls, menu_photo_url, note, stars, review_text, confirmed_tags, reviewed_at, is_public, created_at)
  VALUES (
    v_checkin_1, v_user_id, v_shop_id,
    ARRAY['https://placehold.co/800x600?text=Kino+Vibe'],
    'https://placehold.co/800x600?text=Kino+Menu',
    '很喜歡這裡的侘寂氛圍，水煙和茶都很特別，老闆超親切！',
    5,
    '空間設計非常有質感，龍眼紅茶清香怡人，推薦給喜歡安靜喝茶的朋友。',
    ARRAY['cozy', 'tea', 'quiet'],
    now() - interval '2 days',
    true,
    now() - interval '2 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Private check-in, minimal — no review text
  INSERT INTO public.check_ins
    (id, user_id, shop_id, photo_urls, note, is_public, created_at)
  VALUES (
    v_checkin_2, v_user_id, v_shop_id,
    ARRAY['https://placehold.co/800x600?text=Kino+Interior'],
    '跟老朋友敘舊的好地方，下次還要來。',
    false,
    now() - interval '10 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Public check-in with confirmed tags, no note
  INSERT INTO public.check_ins
    (id, user_id, shop_id, photo_urls, stars, confirmed_tags, is_public, created_at)
  VALUES (
    v_checkin_3, v_user_id, v_shop_id,
    ARRAY['https://placehold.co/800x600?text=Kino+Drinks'],
    4,
    ARRAY['hookah', 'night', 'social'],
    true,
    now() - interval '20 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── shop_menu_items ────────────────────────────────────────────────────────
  -- No unique constraint on (shop_id, item_name), so guard with WHERE NOT EXISTS
  INSERT INTO public.shop_menu_items (shop_id, item_name, price, category, extracted_at)
  SELECT v_shop_id, item_name, price, category, now()
  FROM (VALUES
    ('Espresso',      120::numeric, 'coffee'),
    ('龍眼紅茶',       150::numeric, 'tea'),
    ('俄羅斯蜂蜜蛋糕', 180::numeric, 'dessert'),
    ('豆干',            80::numeric, 'food')
  ) AS t(item_name, price, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shop_menu_items
    WHERE shop_id = v_shop_id AND item_name = t.item_name
  );

  -- ── shop_payment_confirmations ─────────────────────────────────────────────
  -- Matches the shop's known payment_methods: cash + line_pay
  INSERT INTO public.shop_payment_confirmations (shop_id, user_id, method, vote) VALUES
    (v_shop_id, v_user_id, 'cash',     true),
    (v_shop_id, v_user_id, 'line_pay', true)
  ON CONFLICT DO NOTHING;

  -- ── review_responses ───────────────────────────────────────────────────────
  -- Owner reply to the first (public) check-in
  INSERT INTO public.review_responses (checkin_id, shop_id, owner_id, body, created_at)
  VALUES (
    v_checkin_1, v_shop_id, v_user_id,
    '謝謝您的到來！很高興您喜歡我們的龍眼紅茶，期待您下次再訪 🍵',
    now() - interval '1 day'
  ) ON CONFLICT DO NOTHING;

  -- ── shop_followers ─────────────────────────────────────────────────────────
  INSERT INTO public.shop_followers (user_id, shop_id, created_at)
  VALUES (v_user_id, v_shop_id, now() - interval '5 days')
  ON CONFLICT DO NOTHING;

END $$;
