# DEV-18: Categorized Photo Scraping — Design

Date: 2026-03-25
Ticket: [DEV-18](https://linear.app/ytchou/issue/DEV-18)
Related: DEV-6 (menu extraction depends on quality MENU photos)

## Goal

Improve scraped photo quality and utility by:
1. Capturing photo freshness (`uploaded_at`) from Apify's `images[]` field
2. Filtering stale photos at scrape time (age > 5yr, cap 30)
3. Classifying photos asynchronously into MENU / VIBE / SKIP via Claude Haiku
4. Populating the existing `shop_photos.category` and `shop_photos.is_menu` columns that have always been NULL

## Architecture

Two decoupled phases:

**Phase 1 — Scraper enhancement**
Switch `apify_adapter.py` from `imageUrls` (flat strings) to `images[]` (objects with `uploadedAt`). Apply age filter and cap inline. Propagate `uploaded_at` through `ScrapedShopData` → `persist.py` → `shop_photos`.

**Phase 2 — Async classification worker**
New handler `classify_shop_photos.py`. Fetches unclassified photos (`category IS NULL`) for a shop, rewrites URLs to thumbnails, sends each to Claude Haiku, updates `category` + `is_menu`. Triggered automatically after each scrape batch, and triggerable manually as a one-off.

## Components

| File | Change |
|---|---|
| `backend/providers/scraper/interface.py` | `photo_urls: list[str]` → `photos: list[PhotoData]` (url + uploaded_at) |
| `backend/providers/scraper/apify_adapter.py` | Parse `images[]` with age filter + cap 30; fallback to `imageUrls` if absent |
| `backend/workers/persist.py` | Write `uploaded_at` to `shop_photos`; enqueue `classify_shop_photos` after upsert |
| `backend/workers/handlers/classify_shop_photos.py` | New — thumbnail rewrite → Claude Haiku → update category + is_menu + cap enforcement |
| `supabase/migrations/...` | Add `uploaded_at TIMESTAMPTZ` to `shop_photos` (nullable) |

## Data Flow

```
Apify images[] (url + uploadedAt)
  → age filter: drop photos older than 5yr
  → cap: keep 30 most recent by uploadedAt
  → persist to shop_photos (category=NULL, uploaded_at populated)
  → enqueue classify_shop_photos(shop_id)

classify_shop_photos worker:
  → fetch shop_photos WHERE category IS NULL AND shop_id = ?
  → rewrite each URL: =w1920-h1080-k-no → =w400-h225-k-no (thumbnail)
  → Claude Haiku per photo:
      "MENU if readable menu/price text visible,
       VIBE if ambience/food/interior/exterior,
       SKIP if blurry/irrelevant/people-only.
       If both MENU and VIBE, respond MENU."
  → update category + is_menu (MENU → is_menu=true)
  → cap enforcement (newest by uploaded_at kept):
      - if >5 MENU: downgrade extras to SKIP
      - if >10 VIBE: downgrade extras to SKIP
```

### Thumbnail URL rewriting

Google Maps CDN URLs carry size parameters as a suffix:

```
# Original (expensive for Vision)
https://lh5.googleusercontent.com/p/AF1Qip...=w1920-h1080-k-no

# Thumbnail (~10-15x fewer tokens for Claude)
https://lh5.googleusercontent.com/p/AF1Qip...=w400-h225-k-no
```

The worker stores the original URL in the DB — only the thumbnail is sent to Claude for classification.

### Cost estimate

- Apify: $2.10 / 1,000 places (flat per-result — maxImages does not affect billing)
- Claude Haiku vision at thumbnail resolution: ~$0.0002–0.0003 per shop
- 164 shops total cost: ~$0.38 Apify + ~$0.05 Claude = **< $0.50**

## Error Handling

| Scenario | Behaviour |
|---|---|
| `images[]` absent from Apify response | Fall back to `imageUrls` with `uploaded_at=None`; age filter skipped |
| Claude Vision fails on one photo | Log + continue; photo stays `category=NULL`, safe to retry via one-off run |
| Worker job fails mid-batch | Idempotent — always queries `WHERE category IS NULL`; re-trigger safely |
| Thumbnail URL rewrite fails (unexpected format) | Use original URL, log warning |

## Testing Strategy

### Unit tests — `test_apify_adapter.py`
- `images[]` parsing with `uploadedAt` → `PhotoData`
- Age filter drops photos older than 5yr
- Cap at 30 enforced, sorted by recency
- Fallback to `imageUrls` when `images[]` absent

### Unit tests — `test_classify_shop_photos.py`
- Thumbnail URL rewrite (`=w1920-h1080-k-no` → `=w400-h225-k-no`)
- MENU priority: photo qualifying for both → MENU
- 5 MENU cap: 6th MENU photo downgraded to SKIP (newest 5 kept)
- 10 VIBE cap: same logic
- Idempotency: re-running on already-classified shop is a no-op

### Integration test — `test_classify_shop_photos.py`
- Worker with mocked Claude Vision: classifies batch, updates `category` + `is_menu` in DB correctly

## Testing Classification

**(a) New e2e journey?**
- [ ] No — internal data pipeline feature; no user-facing critical path introduced

**(b) Coverage gate impact?**
- [x] Yes — `classify_shop_photos.py` and updated `apify_adapter.py` are enrichment pipeline code; verify 80% coverage gate is met for both

## Legal Note

Google Maps ToS prohibits scraping and redistribution of user-uploaded content. Scraped photos are currently used only in the internal data pipeline (menu extraction). **Before displaying scraped photos on any user-facing page:** decide between (a) user check-in photos only, (b) direct Google Maps URL linking (no hosting), or (c) licensing. This decision must happen before DEV-6 or any shop profile photo feature ships publicly. See ticket for full context.
