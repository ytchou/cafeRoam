-- Seed: local development admin user
-- UUID is fixed so ADMIN_USER_IDS in backend/.env never needs to change after resets.
-- Email: admin@caferoam.local  Password: admin123

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'caferoam.tw@gmail.com',
  extensions.crypt('00000000', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"],"is_admin":true}',
  '{}',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Ensure profile row exists (belt-and-suspenders in case trigger doesn't fire for seeded users)
INSERT INTO public.profiles (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
