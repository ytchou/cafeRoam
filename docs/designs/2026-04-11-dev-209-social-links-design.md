# DEV-209: Social Media Links + Google Maps — Design

Date: 2026-04-11

## Problem

Shop detail pages lack social media links and a Google Maps CTA. `instagram_url` and `facebook_url` columns already exist in the database (migration `20260406000003`) and the Apify scraper already populates them — the backend simply isn't fetching or returning them. `threads_url` doesn't exist yet.

## Decision

Wire existing social URL columns through the full stack, add `threads_url` with website-based classification as fallback for all platforms when Apify returns nothing.

**Search RPC not updated** — shop detail uses `/shops/{id}`, not `search_shops`. Adding columns to the RPC adds overhead to every search query unnecessarily.

## Data Flow

```
Apify data (instagrams[], facebooks[]) → apify_adapter.py
  → extract instagram_url, facebook_url from arrays
  → if null: classify_social_url(website) as fallback
  → always: classify_social_url(website) → threads_url
→ ScrapedShopData(instagram_url, facebook_url, threads_url)
→ persist.py → shops table
→ GET /shops/{id} (new columns in _SHOP_DETAIL_COLUMNS)
→ Shop Pydantic model (CamelModel auto-converts snake_case → camelCase JSON)
→ lib/types/index.ts (instagramUrl, facebookUrl, threadsUrl)
→ shop-detail-client.tsx Links section
```

The prebuild TypeScript pipeline (`pass2-scrape.ts`) uses a parallel `classifySocialUrl()` helper with identical matching rules.

## URL Classification Rules

| Platform  | Matched domains |
|-----------|----------------|
| Instagram | `instagram.com`, `www.instagram.com`, `instagr.am` |
| Facebook  | `facebook.com`, `fb.com`, `m.facebook.com`, `www.facebook.com`, `fb.me` |
| Threads   | `threads.net`, `www.threads.net` |

Fallback logic: keep Apify-provided value; classify from `website` only when Apify returned null.

## UI: Links Section

Placed between the AttributeChips and MenuHighlights sections. Horizontal icon row:

- **Google Maps** (`MapPin` Lucide icon): `https://www.google.com/maps/place/?q=place_id:<id>` or `https://www.google.com/maps?q=<lat>,<lng>`. Renders unconditionally (every shop has coordinates).
- **Instagram, Facebook, Threads**: small inline SVGs, conditional on non-null URL.
- **Website** (`Globe` Lucide icon): shown only when `website` is not already one of the social icons above.

## Alternatives Rejected

- **Update search_shops RPC:** Adds column overhead to all search queries. Shop detail doesn't use the RPC.
- **Store Google Maps URL as a DB column:** Derivable from `google_place_id` + lat/lng. No need to store.
- **Use react-icons for brand icons:** Adds a dependency for 3 icons. Inline SVGs are simpler and zero-dependency.

## Testing Classification

- **(a) New e2e journey?** No — additive to existing page.
- **(b) Coverage gate?** No — `url_classifier.py` is a utility, not a critical-path service.
