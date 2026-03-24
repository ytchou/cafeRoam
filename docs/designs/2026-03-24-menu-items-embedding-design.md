# Design: Store Menu Items & Re-embed Shops for Menu Search (DEV-6)

Date: 2026-03-24
Linear: DEV-6
Status: Approved

## Goal

Enable natural language menu queries like "巴斯克蛋糕", "司康", "氮氣咖啡" by:

1. Persisting extracted menu items into a dedicated `shop_menu_items` table
2. Including menu item names in shop embedding text so they become searchable via vector similarity

Currently, Claude vision extracts menu data and the result is dumped into `shops.menu_data` (JSONB) — not indexed, not included in embeddings. Menu searches return zero relevant results.

---

## Architecture

### New Table: `shop_menu_items`

```sql
CREATE TABLE shop_menu_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_name    TEXT NOT NULL,
  price        NUMERIC(8,0),    -- TWD, whole numbers
  category     TEXT,             -- "coffee", "food", "dessert", etc.
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_menu_items_shop_id ON shop_menu_items(shop_id);
```

**Deduplication strategy:** Replace-on-extract. Each new menu photo extraction for a shop deletes all existing items for that shop before inserting the new batch. Latest extraction always wins. Keeps data fresh; avoids stale price accumulation.

**Cascade:** `ON DELETE CASCADE` ensures shop deletion cleans up menu items automatically (PDPA-safe).

**Existing `menu_data` JSONB column:** Kept temporarily (dual-write). Cleanup in a follow-up ticket.

---

## Component Changes

### 1. `handle_enrich_menu_photo()` — `backend/workers/handlers/enrich_menu_photo.py`

**Current behavior:** Calls `llm.extract_menu_data()`, writes JSONB blob to `shops.menu_data`.

**Updated behavior:**

1. Call `llm.extract_menu_data()` (unchanged)
2. If items returned:
   - DELETE existing `shop_menu_items` WHERE `shop_id = X` (replace-on-extract)
   - INSERT new items into `shop_menu_items`
   - Continue writing to `shops.menu_data` JSONB (dual-write, temporary)
3. Queue a `GENERATE_EMBEDDING` job to rebuild the shop's embedding with the new menu data

**Empty extraction guard:** If LLM returns `items=[]`, skip DELETE+INSERT to preserve any previously extracted items.

### 2. `handle_generate_embedding()` — `backend/workers/handlers/generate_embedding.py`

**Current behavior:** Builds text from `"{name}. {description}"`, embeds, sets `processing_status = "publishing"`, queues `PUBLISH_SHOP`.

**Updated behavior:**

1. Load shop data including `processing_status`
2. Load menu items: `SELECT item_name FROM shop_menu_items WHERE shop_id = X`
3. Build enriched embedding text:
   ```
   "{name}. {description}"                          # no menu items
   "{name}. {description} | {item1}, {item2}, ..."  # with menu items
   ```
4. **Safe re-embed for live shops:** Only update `processing_status` and queue `PUBLISH_SHOP` if shop is NOT already live. If already live, update only the `embedding` column — shop stays visible throughout.

**Status transition rules:**

| Shop's current status | Status after embed | Queue PUBLISH_SHOP? |
| --------------------- | ------------------ | ------------------- |
| `embedding`           | `publishing`       | Yes (new shop flow) |
| `live`                | `live` (unchanged) | No (re-embed only)  |

This is the critical safety guarantee: **no live shop goes offline during re-embedding.**

### 3. Re-embed Script — `backend/scripts/reembed_live_shops.py`

A one-time script that enqueues `GENERATE_EMBEDDING` jobs for all 164 live shops. Uses the existing `JobQueue` provider abstraction.

```python
# Queries all shops WHERE processing_status = 'live'
# Enqueues GENERATE_EMBEDDING for each
# Logs progress + total count
```

Run after deploy: `cd backend && uv run python -m scripts.reembed_live_shops`

Estimated cost: ~$0.01 (OpenAI text-embedding-3-small, 164 shops × ~200 tokens).

---

## Data Flow

```
User submits menu photo at check-in
    → trg_checkin_after_insert queues ENRICH_MENU_PHOTO job
    → handle_enrich_menu_photo():
        → llm.extract_menu_data(image_url)     # Claude vision
        → DELETE shop_menu_items WHERE shop_id  # replace-on-extract
        → INSERT new items                      # persist
        → UPDATE shops SET menu_data = ...      # dual-write (temp)
        → enqueue GENERATE_EMBEDDING            # trigger re-embed
    → handle_generate_embedding():
        → SELECT item_name FROM shop_menu_items # load menu
        → build embedding text with menu items
        → OpenAI embed()
        → UPDATE shops SET embedding = ...      # in-place, status unchanged
        → (no PUBLISH_SHOP — shop was already live)
```

---

## What's NOT Changing

- `llm.extract_menu_data()` — Anthropic adapter already works correctly
- `MenuExtractionResult` model — already has the right shape
- `search_shops` RPC — cosine similarity already works; richer embeddings improve results automatically
- Frontend — no UI changes
- `search_shops` function signature — no changes needed

---

## Testing Strategy

**`test_enrich_menu_photo`:**

- Given: LLM returns items — verify DELETE then INSERT into `shop_menu_items` (replace behavior)
- Given: LLM returns empty items — verify no DELETE (guard preserved)
- Verify: `GENERATE_EMBEDDING` job enqueued after extraction
- Verify: `shops.menu_data` still written (dual-write)

**`test_generate_embedding`:**

- Given: shop has menu items — verify they appear in embedding text after `|`
- Given: shop has no menu items — verify embedding text matches original format
- Given: shop is already live — verify status stays `live` and no `PUBLISH_SHOP` enqueued
- Given: shop is in `embedding` status — verify status advances to `publishing` and `PUBLISH_SHOP` enqueued

**`test_reembed_live_shops` (script):**

- Verify: GENERATE_EMBEDDING job enqueued for each live shop
- Verify: non-live shops not enqueued

---

## Verification (Post-Deploy)

1. Run `reembed_live_shops.py` — confirm 164 jobs enqueued in job queue
2. Monitor worker logs — confirm jobs process without errors
3. Test search: query "巴斯克蛋糕" — confirm shops with that item in `shop_menu_items` rank higher
4. Confirm all 164 shops remain `live` throughout (check admin dashboard)

---

## Out of Scope

- Frontend display of `shop_menu_items` (separate feature)
- Dropping `shops.menu_data` JSONB column (follow-up cleanup ticket)
- Menu item deduplication across multiple check-ins beyond replace-on-extract (not needed for V1)
