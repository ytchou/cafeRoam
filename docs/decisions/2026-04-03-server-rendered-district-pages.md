# ADR: Server-rendered district pages with ISR (diverging from client-side vibe pattern)

Date: 2026-04-03

## Decision

District landing pages use Next.js server components with `generateMetadata` and ISR (5-minute revalidation), diverging from the client-side SWR pattern used by vibe pages.

## Context

District pages are being built primarily for SEO — to rank for queries like "大安區咖啡廳推薦". The existing vibe pages (`app/explore/vibes/[slug]/page.tsx`) use client-side rendering with SWR hooks and have no dynamic server-side metadata. This means vibe pages have no per-page `<title>`, `<meta description>`, or server-rendered HTML for crawlers.

## Alternatives Considered

- **Client-side SWR (consistent with vibes)**: Would keep the codebase consistent but defeat the primary goal — crawlers would see no content and no metadata. Rejected because SEO is the entire purpose of this feature.
- **Static generation (SSG) with `generateStaticParams`**: Would produce the best crawl performance but requires a build step per district. At 12 districts this is feasible, but ISR is simpler and auto-refreshes when shop data changes.

## Rationale

Server components with ISR give the best balance: server-rendered HTML with dynamic metadata for crawlers, automatic revalidation as shop data changes, and no build-time generation needed. The shop detail page already uses this pattern successfully (`app/shops/[shopId]/[slug]/page.tsx`), so this is a proven approach in the codebase.

The inconsistency with vibe pages is acknowledged — vibe pages should eventually be migrated to the same pattern (tracked as a follow-up), but that migration shouldn't block this feature.

## Consequences

- Advantage: Crawlers see full HTML + proper metadata from first request
- Advantage: ISR cache means no cold-start latency after first request
- Advantage: Follows the shop detail page's proven SSR pattern
- Disadvantage: Two rendering patterns coexist for similar-looking pages (vibes = client, districts = server)
- Disadvantage: District page cannot use browser geolocation for distance sorting (would need a client sub-component for that, deferred)
