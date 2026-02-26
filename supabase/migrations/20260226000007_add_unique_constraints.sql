-- Prevent duplicate shop submissions for the same URL
ALTER TABLE shop_submissions ADD CONSTRAINT uq_shop_submissions_url
  UNIQUE (google_maps_url);

-- Prevent duplicate photos per shop from repeated scrapes
ALTER TABLE shop_photos ADD CONSTRAINT uq_shop_photos_shop_url
  UNIQUE (shop_id, url);
