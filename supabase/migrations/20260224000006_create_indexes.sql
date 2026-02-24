-- Geospatial
CREATE INDEX idx_shops_geo ON shops (latitude, longitude);

-- Vector search (HNSW, cosine similarity)
CREATE INDEX idx_shops_embedding ON shops
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Mode filtering (partial indexes)
CREATE INDEX idx_shops_mode_work ON shops (mode_work) WHERE mode_work IS NOT NULL;
CREATE INDEX idx_shops_mode_rest ON shops (mode_rest) WHERE mode_rest IS NOT NULL;
CREATE INDEX idx_shops_mode_social ON shops (mode_social) WHERE mode_social IS NOT NULL;

-- Tags
CREATE INDEX idx_shop_tags_shop ON shop_tags (shop_id);
CREATE INDEX idx_shop_tags_tag ON shop_tags (tag_id);

-- User data
CREATE INDEX idx_lists_user ON lists (user_id);
CREATE INDEX idx_check_ins_user ON check_ins (user_id, created_at DESC);
CREATE INDEX idx_check_ins_shop ON check_ins (shop_id);
CREATE INDEX idx_stamps_user ON stamps (user_id, earned_at DESC);

-- Photos
CREATE INDEX idx_shop_photos_shop ON shop_photos (shop_id, sort_order);

-- Job queue (worker polling)
CREATE INDEX idx_job_queue_pending
  ON job_queue (priority DESC, scheduled_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_job_queue_failed
  ON job_queue (created_at DESC)
  WHERE status IN ('failed', 'dead_letter');
