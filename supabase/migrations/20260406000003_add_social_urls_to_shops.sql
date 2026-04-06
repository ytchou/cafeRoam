alter table shops
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;
