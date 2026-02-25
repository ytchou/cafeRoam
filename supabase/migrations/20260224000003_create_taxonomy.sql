CREATE TABLE taxonomy_tags (
  id         TEXT PRIMARY KEY,
  dimension  TEXT NOT NULL CHECK (dimension IN
    ('functionality', 'time', 'ambience', 'mode', 'coffee')),
  label      TEXT NOT NULL,
  label_zh   TEXT NOT NULL,
  aliases    TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shop_tags (
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  tag_id          TEXT NOT NULL REFERENCES taxonomy_tags(id) ON DELETE CASCADE,
  confidence      NUMERIC(3,2) NOT NULL,
  distinctiveness NUMERIC(5,4) DEFAULT 0,
  PRIMARY KEY (shop_id, tag_id)
);
