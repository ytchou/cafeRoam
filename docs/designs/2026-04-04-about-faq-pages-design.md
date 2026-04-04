# About + FAQ Pages Design

**Date:** 2026-04-04
**Ticket:** DEV-211
**Hat:** CEO (cross-functional: CTO + CMO)

## Goal

Add `/about` and `/faq` static pages to CafeRoam to:

1. **SEO/AI-EO:** Give LLMs and search crawlers structured, entity-rich context about what CafeRoam is
2. **User trust:** Help new visitors understand the concept and value prop before signing up

## Decision

**Option A chosen: Two dedicated static routes (`/about` + `/faq`)**

**Rejected alternatives:**

- Single `/about` with inline FAQ — FAQ not independently citable/linkable, weaker SEO
- Fat footer with no routes — no dedicated URLs, weakest for both crawlers and users

**Rationale:** Development cost is low (static pages follow the `/privacy` pattern). Dedicated URLs are independently indexable by Google and citable by LLMs. The warm casual tone prevents the "corporate" feel.

## Architecture

### New Routes

- `app/about/page.tsx` — static SSG page, Organization JSON-LD
- `app/faq/page.tsx` — static SSG page, FAQPage JSON-LD + accordion

### New Components

| Component                               | Purpose                                           |
| --------------------------------------- | ------------------------------------------------- |
| `components/navigation/footer.tsx`      | Proper footer with About/FAQ/Privacy links        |
| `components/seo/FaqPageJsonLd.tsx`      | FAQPage schema wrapper via existing `JsonLd`      |
| `components/seo/OrganizationJsonLd.tsx` | Organization schema wrapper via existing `JsonLd` |

### Modified Files

| File                                  | Change                                                |
| ------------------------------------- | ----------------------------------------------------- |
| `components/navigation/app-shell.tsx` | Replace inline `<footer>` with `<Footer />` component |
| `app/sitemap.ts`                      | Add `/about` and `/faq` to `staticPages` array        |

## Content Strategy

**Tone:** Warm & casual, like a friend explaining a cool app. Chinese-primary with English terms where natural (e.g., "AI 語意搜尋", "Polaroid Wall").

### About Page (`/about`)

1. Hero: title + tagline
2. 我們在做什麼 — entity-dense description for AI-EO
3. 怎麼運作的 — AI search + 3 modes + polaroid wall
4. 誰在做這件事 — founder context (E-E-A-T signals)
5. Back-to-app CTA

### FAQ Content (~8 questions, brand-level)

1. 啡遊 CafeRoam 是什麼？
2. AI 搜尋是怎麼運作的？
3. 工作/休息/社交模式是什麼意思？
4. 店家資料是怎麼來的？
5. 我可以提交新的咖啡廳嗎？
6. 啡遊是免費的嗎？
7. 我的個人資料安全嗎？
8. 啡遊跟 Google Maps 有什麼不同？

## SEO / AI-EO

| Signal               | Implementation                                             |
| -------------------- | ---------------------------------------------------------- |
| FAQPage JSON-LD      | `FaqPageJsonLd` on `/faq` → Google rich results            |
| Organization JSON-LD | `OrganizationJsonLd` on `/about` → entity grounding        |
| Sitemap              | Both pages at `priority: 0.5`, `changeFrequency: monthly`  |
| robots.txt           | No changes — existing allowlist covers `/about` and `/faq` |

## Footer

Replace the current inline footer (desktop-only, BuyMeACoffee only) with a proper `<Footer>` component:

- **Desktop + mobile:** Renders on all non-find pages
- **Links:** 關於啡遊 / 常見問題 / 隱私權政策 / BuyMeACoffee
- **Layout:** Minimal, consistent with existing aesthetic

## Testing Classification

- [x] **New e2e journey?** No — static content pages, no new critical user path
- [x] **Coverage gate impact?** No — no critical-path service touched

## Sub-issues (execution order)

| Ticket  | Title                                            | Size           |
| ------- | ------------------------------------------------ | -------------- |
| DEV-213 | Create Footer component with nav links           | S (Foundation) |
| DEV-214 | Build /about page with Organization JSON-LD      | M              |
| DEV-215 | Build /faq page with FAQPage JSON-LD + accordion | M              |
| DEV-216 | Add /about + /faq to sitemap + validate SEO      | S              |
