# Design: SEO & GEO Optimization for Launch (DEV-14)

Date: 2026-03-25
Hat: CEO (cross-functional — CTO + CMO)
Approach: Next.js Native SEO + Heavy GEO Investment

## Context

CafeRoam has 164+ live shops with rich taxonomy data (mode scores, vibe tags, MRT stations) but minimal SEO infrastructure. Shop detail pages have basic `generateMetadata` with OpenGraph images, but no sitemap, robots.txt, llms.txt, JSON-LD structured data, or homepage metadata.

PRD positions SEO as the **secondary** discovery channel (6-12 month horizon), with Threads as primary. This design builds the technical foundation that makes both channels more effective — rich OG cards improve Threads sharing, structured data improves Google indexing, and GEO positions CafeRoam for AI-powered discovery.

## Decisions

- **Approach:** Next.js native SEO primitives (sitemap.ts, robots.ts, generateMetadata) + custom llms.txt route + JSON-LD components. Zero new dependencies.
- **GEO priority:** Heavy investment — llms.txt, AI bot directives, FAQ schema on shop pages, structured answer blocks for AI citation.
- **Landing pages:** Auto-generated from taxonomy data (Phase 2). Not manually curated.
- **Measurement:** Deferred to DEV-30 (GA4 setup).

## Phase 1 — Technical Foundation (This Ticket)

### 1. Dynamic Sitemap (`app/sitemap.ts`)

- Query all published shops (`processing_status = 'live'`) from Supabase
- Generate entries: `/shops/{shopId}/{slug}` for each shop
- Include static pages: `/`, `/explore`, `/explore/vibes/*`
- `changeFrequency: 'weekly'`, `priority: 0.8` for shops, `1.0` for homepage
- Next.js handles `/sitemap.xml` route automatically

### 2. Robots.txt (`app/robots.ts`)

- Allow all crawlers on public paths (`/`, `/shops/*`, `/explore/*`)
- Disallow auth-gated paths (`/profile`, `/lists`, `/settings`, `/login`, `/signup`)
- Explicitly allow AI bots: `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`
- Point to sitemap URL

### 3. llms.txt (`app/llms.txt/route.ts`)

Route handler returning `text/plain` with:

- Site identity: what CafeRoam is, target audience, geographic scope (Taiwan)
- Data structure: shops with mode scores (work/rest/social), taxonomy tags across 5 dimensions
- Taxonomy dimensions: functionality, time, ambience, mode, coffee
- Coverage: cities served, number of shops, data freshness
- Example queries an AI assistant could answer using the data
- Link to sitemap and key pages

### 4. JSON-LD Structured Data

#### Shop Detail Pages — `CafeOrCoffeeShop` Schema

```json
{
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  "name": "Shop Name",
  "description": "Shop description",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Full address",
    "addressLocality": "Taipei",
    "addressCountry": "TW"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 25.033,
    "longitude": 121.565
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.2,
    "reviewCount": 87
  },
  "image": "https://...",
  "url": "https://caferoam.com/shops/{id}/{slug}",
  "telephone": "+886-2-xxxx-xxxx",
  "priceRange": "$$",
  "openingHoursSpecification": [...]
}
```

**Backend API change:** Expose `phone`, `website`, `opening_hours`, `price_range` from the shops endpoint (fields exist in DB but aren't currently returned).

#### Shop Detail Pages — `FAQPage` Schema (GEO)

Auto-generate 3-5 Q&A pairs per shop from taxonomy data:

| Question Pattern                         | Answer Source                          |
| ---------------------------------------- | -------------------------------------- |
| "Is {shop} good for remote work?"        | `mode_work` score + functionality tags |
| "What's the vibe at {shop}?"             | Ambience tags + mode scores            |
| "Where is {shop} located?"               | Address + MRT station                  |
| "What kind of coffee does {shop} serve?" | Coffee dimension tags                  |
| "When is {shop} open?"                   | Opening hours (if available)           |

This gives AI engines citable, structured answers — the core GEO play.

#### Homepage — `WebSite` + `SearchAction` Schema

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "啡遊 CafeRoam",
  "url": "https://caferoam.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://caferoam.com/explore?q={search_term}",
    "query-input": "required name=search_term"
  }
}
```

### 5. Enhanced Metadata

#### Root Layout (`app/layout.tsx`)

- Add `metadataBase: new URL('https://caferoam.com')`
- Add Twitter card config: `card: 'summary_large_image'`
- Enhance default OG: `type: 'website'`, `locale: 'zh_TW'`, `siteName: '啡遊 CafeRoam'`

#### Homepage (`app/page.tsx`)

- Add `generateMetadata` with targeted title/description
- Title: `啡遊 CafeRoam — 探索台灣精品咖啡廳`
- Description targeting primary search intents (remote work cafes, quiet cafes, etc.)

#### Explore Pages

- `/explore` — general discovery metadata
- `/explore/vibes/[slug]` — vibe-specific titles and descriptions from tag data

### 6. Component Structure

```
components/seo/
├── JsonLd.tsx              # Generic JSON-LD renderer (server component)
├── ShopJsonLd.tsx          # CafeOrCoffeeShop + FAQPage schema
├── WebsiteJsonLd.tsx       # WebSite + SearchAction schema
└── generateShopFaq.ts      # FAQ Q&A generation from taxonomy data
```

All server-rendered via `<script type="application/ld+json">`.

## Phase 2 — Content Flywheel (Follow-up Ticket)

- **Auto-generated landing pages:** `/taipei/[district]/[intent]` (e.g., `/taipei/da-an/remote-work`)
- Aggregate shop data by district + mode/tag combination
- Each page targets a long-tail search intent
- Freshness signals: "Last updated" from most recent check-in date
- FAQ schema per landing page for GEO

## Phase 3 — Authority (Future)

- Backlink outreach to Taipei lifestyle/food blogs
- Content partnerships with coffee communities
- User-generated content (check-in reviews) as unique, fresh content per shop

## CMO Perspective

**Why this matters for growth:**

- Every shop page becomes a rich, citable result in both Google and AI engines
- FAQ schema answers the exact questions people ask on Threads ("is X good for work?")
- llms.txt makes CafeRoam legible to AI crawlers as a Taiwan cafe authority
- Threads sharing gets richer: OG cards with shop photos, proper titles, descriptions
- Auto-generated landing pages (Phase 2) target long-tail search intents passively

**Content strategy alignment:**

- Phase 1 is infrastructure — no editorial effort needed
- Phase 2 auto-generates from existing data — no content team required
- Phase 3 is the only phase requiring human effort (outreach)

## Testing Classification

### (a) New e2e journey?

- [ ] No — SEO changes are server-rendered metadata/structured data. No new user-facing interactive paths.

### (b) Coverage gate impact?

- [ ] No — no critical-path services touched. Backend shops endpoint gets minor field additions (exposing existing DB columns).

### Recommended Tests

- **Unit:** JSON-LD output correctness (valid schema, required fields present)
- **Unit:** FAQ generation logic (produces sensible Q&A from taxonomy data)
- **Unit:** Sitemap generation (includes all live shops, excludes non-live)
- **Integration:** Verify structured data renders in HTML response for shop detail pages
