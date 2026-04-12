# Design: Unified shop_menu_items Population (DEV-315 + DEV-313)

Date: 2026-04-12

## Goal

Wire the ENRICH_MENU_PHOTO trigger into the photo classification pipeline and extract structured menu items from reviews, so `shop_menu_items` is populated from both MENU photos and review text with a unified source model.

## Before State

```
CLASSIFY_SHOP_PHOTOS → marks photos MENU/VIBE/SKIP
  → ENRICH_SHOP (fires, writes menu_highlights text array to shops)
  → ❌ ENRICH_MENU_PHOTO never fires

Result:
  shop_menu_items: empty — never populated
  shops.menu_highlights: text array of food/drink names (not structured)
  shops.menu_data: legacy column, doesn't exist in DB
```

## After State

```
CLASSIFY_SHOP_PHOTOS → marks photos MENU/VIBE/SKIP
  → ENRICH_SHOP (fires, now also writes structured items from reviews)
  → ENRICH_MENU_PHOTO (fires for shops with >=1 MENU photo, dedup-guarded)
    → GENERATE_EMBEDDING

Result:
  shop_menu_items: populated from BOTH sources with source attribution
  shops.menu_highlights: unchanged (kept for backward compat)
  shops.menu_data: column dropped (dual-write removed)
```

## Architecture

Both sources (photo extraction via `enrich_menu_photo` and review extraction via `enrich_shop`) write to `shop_menu_items` with a `source` enum ('photo'|'review') and optional `source_photo_id` FK. Photo-sourced items win on `item_name` collision. The trigger fires from `classify_shop_photos` after classification completes.

### Pipeline Chain

```
SCRAPE → persist.py upserts photos
  → CLASSIFY_SHOP_PHOTOS
    → ENRICH_SHOP (always)
    │   └─ writes review-sourced items to shop_menu_items (source='review')
    │   └─ enqueues GENERATE_EMBEDDING
    → ENRICH_MENU_PHOTO (if >=1 MENU photo + dedup passes)
        └─ writes photo-sourced items to shop_menu_items (source='photo')
        └─ dedup: photo-wins on item_name collision
        └─ enqueues GENERATE_EMBEDDING
```

## Components

### 1. Migration — shop_menu_items schema extension

Add to `shop_menu_items`:

- `source TEXT NOT NULL DEFAULT 'photo'` — values: 'photo', 'review'
- `source_photo_id UUID REFERENCES shop_photos(id) ON DELETE SET NULL` — nullable

Drop from code: `shops.menu_data` dual-write (column doesn't exist in migrations anyway).

### 2. Enqueue trigger (classify_shop_photos.py)

After classification completes, alongside existing ENRICH_SHOP enqueue:

- Query shop_photos for category='MENU' rows
- Dedup guard: compare shop_menu_items.extracted_at vs shop_photos.uploaded_at per photo
- If any stale/new photos, enqueue one ENRICH_MENU_PHOTO with payload: {shop_id, photos: [{photo_id, image_url}]}
- Priority: 3

### 3. Handler rework (enrich_menu_photo.py)

- Accept multi-photo payload: photos: list[{photo_id, image_url}]
- For each photo: extract via LLM, delete-by-source_photo_id, photo-wins dedup (delete colliding review items), insert with source='photo'
- Remove shops.menu_data dual-write
- Single GENERATE_EMBEDDING enqueue at end

### 4. Review extraction (enrich_shop.py)

Extend CLASSIFY_SHOP_TOOL schema with menu_items structured array. After existing enrichment writes:

- Delete shop_menu_items where source='review' for shop
- Skip items where item_name already exists from source='photo' (photo-wins)
- Insert remaining with source='review'

### 5. LLM schema extension (\_tool_schemas.py)

Add menu_items to CLASSIFY_SHOP_SCHEMA: array of {name (required), price, category}, maxItems 20.

## Data Flow

```
enrich_shop receives job (always fires)
  ├─ LLM enrichment (CLASSIFY_SHOP_TOOL, now with menu_items output)
  ├─ Write tags, description, mode scores (existing, unchanged)
  ├─ DELETE shop_menu_items WHERE shop_id=X AND source='review'
  ├─ SELECT item_name FROM shop_menu_items WHERE shop_id=X AND source='photo'
  ├─ Filter: remove review items that collide with photo item_names
  └─ INSERT remaining review items (source='review')

enrich_menu_photo receives job (only if MENU photos exist + dedup passes)
  ├─ FOR each photo in payload.photos:
  │   ├─ llm.extract_menu_data(image_url)
  │   ├─ DELETE shop_menu_items WHERE source_photo_id = photo.photo_id
  │   ├─ DELETE shop_menu_items WHERE source='review' AND item_name IN (new items)
  │   └─ INSERT items (source='photo', source_photo_id=photo.photo_id)
  └─ enqueue GENERATE_EMBEDDING
```

## Error Handling

- One photo failure in multi-photo batch: log, continue to next photo
- All photos fail: job fails, retries up to max_attempts=3
- Review extraction returns empty items: no-op (don't delete existing review items)
- LLM schema extension backward-compatible: menu_items defaults to empty list

## Decisions

| Decision                 | Choice                                             | Alternatives Rejected                                                             |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Job granularity          | One ENRICH_MENU_PHOTO per shop with all photo URLs | Per-photo jobs (unnecessary complexity), best-photo-only (wastes data)            |
| Source model             | source enum + source_photo_id FK                   | source_photo_id only (implicit), separate tables (over-normalized)                |
| Review traceability      | source='review' only (no FK)                       | source_review_id FK (batch extraction, no 1:1 mapping)                            |
| Conflict resolution      | Additive, photo-wins on item_name collision        | Photo replaces all (loses review-only items), keep all duplicates (inflated data) |
| Review extraction method | Extend CLASSIFY_SHOP_TOOL (no new LLM call)        | Separate LLM call (added cost), new job type (heaviest)                           |

## Testing Classification

- [x] No — no new critical user path introduced (backend pipeline only)
- [x] No — no critical-path service touched (enrichment pipeline)
- [x] No — no existing E2E tests reference menu extraction
