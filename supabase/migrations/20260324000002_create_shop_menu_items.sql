-- shop_menu_items: structured menu items extracted from check-in menu photos.
-- Replace-on-extract: handler deletes all rows for a shop before inserting new batch.
-- ON DELETE CASCADE ensures cleanup when a shop is deleted (PDPA-safe).

CREATE TABLE shop_menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    item_name    TEXT NOT NULL,
    price        NUMERIC(8, 0),        -- TWD whole numbers; NULL if not visible
    category     TEXT,                  -- e.g. "coffee", "food", "dessert"; NULL if unclear
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_menu_items_shop_id ON shop_menu_items(shop_id);
