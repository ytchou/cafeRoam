CREATE TABLE job_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     TEXT NOT NULL CHECK (job_type IN (
    'enrich_shop', 'enrich_menu_photo', 'generate_embedding',
    'staleness_sweep', 'weekly_email'
  )),
  payload      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'claimed', 'completed', 'failed', 'dead_letter'
  )),
  priority     SMALLINT NOT NULL DEFAULT 0,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 3,
  last_error   TEXT,
  claimed_at   TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Combined trigger: auto-create stamp + queue menu photo enrichment
CREATE OR REPLACE FUNCTION handle_checkin_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create stamp for the check-in
  INSERT INTO stamps (user_id, shop_id, check_in_id, design_url, earned_at)
  VALUES (NEW.user_id, NEW.shop_id, NEW.id, '/stamps/' || NEW.shop_id || '.svg', now());

  -- Queue menu photo enrichment if photo provided
  IF NEW.menu_photo_url IS NOT NULL THEN
    INSERT INTO job_queue (job_type, payload, priority)
    VALUES (
      'enrich_menu_photo',
      jsonb_build_object('shop_id', NEW.shop_id, 'image_url', NEW.menu_photo_url),
      5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_checkin_after_insert
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION handle_checkin_after_insert();

-- Trigger: enforce max 3 lists per user
CREATE OR REPLACE FUNCTION enforce_max_lists_per_user()
RETURNS TRIGGER AS $$
DECLARE
  list_count INTEGER;
BEGIN
  -- Serialize concurrent list creation for the same user to prevent TOCTOU race
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text)::bigint);

  SELECT COUNT(*) INTO list_count
  FROM lists WHERE user_id = NEW.user_id;

  IF list_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 lists allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_max_lists
  BEFORE INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_lists_per_user();
