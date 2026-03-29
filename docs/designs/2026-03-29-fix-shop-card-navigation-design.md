# Fix Shop Card Navigation (DEV-84)

Date: 2026-03-29

## Problem

Clicking shop cards in the map mobile layout (`/`) does not navigate to the shop detail page. `handleShopNavigate` at `app/page.tsx:113` pushes `/shops/${id}`, but the shop detail route lives at `app/shops/[shopId]/[slug]/page.tsx` — requiring both `shopId` and `slug` segments. The single-segment URL matches no route.

## Solution

Add a catch-all redirect route at `app/shops/[shopId]/page.tsx`:

1. Fetch shop by ID from the backend
2. Redirect to `/shops/[shopId]/[slug]` (server-side 308)
3. If shop not found, call `notFound()`

No changes to `LayoutShop`, `ShopCarousel`, `ShopCardCarousel`, or callback signatures.

## Data Flow

```
User clicks shop card
  -> router.push(`/shops/${id}`)
  -> app/shops/[shopId]/page.tsx (new)
  -> fetch shop -> get slug
  -> redirect(`/shops/${id}/${slug}`)
  -> app/shops/[shopId]/[slug]/page.tsx (existing)
```

## Files Changed

| File | Action |
|------|--------|
| `app/shops/[shopId]/page.tsx` | New — redirect route |

## Alternatives Rejected

- **Thread slug through component tree:** Add `slug` to `LayoutShop`, change callback signatures across 4-5 files. More invasive, and still needs the catch-all for external links without slugs.
- **Flatten route to `/shops/[shopId]`:** Removes slug from URL entirely. Loses SEO-friendly URLs and breaks existing links.

## Testing

- Manual QA: click shop cards on map view, verify navigation to shop detail
- No new e2e journey (fixes existing broken flow)
- No critical-path service touched
