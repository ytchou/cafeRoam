CREATE TABLE shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  mrt             TEXT,
  phone           TEXT,
  website         TEXT,
  opening_hours   JSONB,
  rating          NUMERIC(2,1),
  review_count    INTEGER NOT NULL DEFAULT 0,
  price_range     TEXT,
  description     TEXT,
  menu_url        TEXT,
  cafenomad_id    TEXT UNIQUE,
  google_place_id TEXT UNIQUE,
  enriched_at     TIMESTAMPTZ,
  enriched_model  TEXT,
  mode_work       NUMERIC(3,2),
  mode_rest       NUMERIC(3,2),
  mode_social     NUMERIC(3,2),
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shop_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  category   TEXT,
  is_menu    BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shop_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  stars        SMALLINT CHECK (stars BETWEEN 1 AND 5),
  published_at TEXT,
  language     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
