# Product Requirements Document: CafeRoam (啡遊)

> Last updated: 2026-02-23
> Version: 1.0

---

## 1. Executive Summary

CafeRoam is a mobile-first web directory for Taiwan's independent coffee shop scene, powered by AI semantic search and multi-mode discovery (work/rest/social), designed to become the go-to shareable link on Threads when someone asks "where should I go?"

---

## 2. Problem Statement

**The problem:** Finding the right coffee shop in Taiwan is genuinely frustrating. Google Maps is crowded with chains and SEO-optimized listings. Every existing specialized tool (Cafe Nomad, Cafeting, Thirsty Bean) serves only one mode — "where can I work?" — and fails at everything else: social outings, a quiet afternoon, great specialty coffee, specific food offerings. On Threads, coffee shop questions get dozens of responses but the answers are always Google Maps links — scattered, hard to browse, no memory, no intelligence.

**Who has it:** Coffee shop goers in Taiwan (25-35, urban) who plan visits intentionally. They're deciding where to spend the next 2-4 hours and want to match the shop to their mood and needs. This happens 2-5 times per week.

**Why current solutions fail:** Google Maps lacks the intentionality layer. Cafe Nomad is work-mode only with no retention. Thirsty Bean proved demand but faded with no hooks. Cafeting is productivity-first, not discovery-first. None have semantic search, multi-mode discovery, or a shareable web experience.

---

## 3. Market Timing — Why Now

- LLMs have made semantic search on unstructured data (menus, reviews, vibes) feasible for a solo developer — this wasn't true 3 years ago
- Threads is Taiwan's fastest-growing social platform; coffee discovery discussions happen constantly and shareable web links are the natural format
- Thirsty Bean's App Store #1 viral moment in 2025 proved massive latent demand exists
- Competitors are stagnating or deepening into productivity tools, not broadening into discovery
- Cafe Nomad's open API provides a data bootstrapping shortcut for 2,200+ shops

---

## 4. Target Audience

**Primary user:** Urban Taiwanese coffee shop goer, 25-35, who visits coffee shops 2-5x/week with different intentions each time — sometimes to work, sometimes to rest, sometimes for a social outing or specialty coffee.

**Their key pain point:** Existing tools only answer "where can I work?" — not "where should I go for a slow afternoon?" or "which shop near Zhongshan has basque cake?"

**What they currently do instead:** Ask on Threads (get Google Maps links back), search Cafe Nomad (work-mode only), or rely on friends' recommendations with no discovery.

---

## 5. Unfair Advantage & Founding Insight

**Founding insight:** Every competitor serves "work mode" — the assumption that coffee shop discovery is about finding a place to be productive. In reality, people have 4 distinct modes (work, rest, social, great coffee), and no tool serves all of them with semantic intelligence.

**Defensible advantage:** Semantic search requires enriched structured data — menus, offerings, vibes — built on a controlled taxonomy. This takes time to build and can't be replicated quickly. The taxonomy compounds over time. Web-first with shareable links is a structural distribution advantage on Threads that app-first competitors can't easily match.

---

## 6. Discovery Channels

- **Primary: Threads** — replying helpfully to "where should I go?" questions with CafeRoam links. Beta testers share organically. Developer persona builds presence in coffee communities.
- **Secondary: SEO** — individual shop pages and "Taipei coffee shop [attribute]" content accumulates search traffic over 6-12 months.
- **Tertiary: Coffee bloggers / IG accounts** — outreach post-validation for amplification once traffic warrants it.

---

## 7. Core Features — V1 Scope

### In Scope

- Shop directory with **list view + map view toggle** (Mapbox)
- **Geolocation** — "nearby me" search with location permission
- **Multi-dimension filters:** functionality (outlet, WiFi), time (late night, no time limit, early bird), ambience (quiet, lively, chit-chat), mode (work/rest/social)
- **Semantic search** — ChatGPT-style chatbox on landing page, auth-gated, powered by pgvector + taxonomy boost
- **Auth wall:** logged-out = directory + map + shop detail; logged-in = semantic search + lists + check-ins + profile
- **User lists** — max 3 lists per user, unlimited locations per list (private in V1)
- **Check-in system** — photo upload (required) + text note (optional) + menu photo (optional, feeds data pipeline)
- **Stamp/collectible** earned per shop checked into
- **Private user profile page** — check-in history, stamps earned, lists
- **Weekly curated email** — fixed schedule, same content for all users
- **Data pipeline** — Cafe Nomad import + Google Maps scraping via Apify + Claude Haiku enrichment → taxonomy tags + OpenAI embeddings
- **Taxonomy system** — canonical tag database powering both filter UI and search ranking
- **Mobile-first responsive web** — shareable URLs for Threads
- **Shop data reports** — "回報錯誤" button on shop pages; any user can flag incorrect data (hours, wifi, name, other) with a free-text description; reports batched daily into Linear for ops triage

### Explicitly Out of Scope for V1

These will NOT be built in V1. Any scope change requires an explicit decision and a PRD_CHANGELOG.md entry.

- Native iOS/Android app (web-first is the distribution strategy)
- Public user profiles (profile page is private in V1)
- ~~Public social feed~~ — **Moved to in-scope (2026-03-24):** Community feed of public check-ins, auth-gated, with district and vibe tag filters. See [design doc](docs/designs/2026-03-24-community-feed-design.md).
- **Shop following** — heart toggle on shop page, follower counts (10+ threshold), profile Following section
- Shareable curated lists (lists are private in V1)
- Shop owner claiming / premium pages
- Personalized weekly email (needs usage data first)
- Coverage outside Taipei
- Comment/review system
- CAFFÈCOIN integration
- ~~Community data contributions~~ — **Moved to in-scope (2026-03-26):** Authenticated users can submit café Google Maps URLs. Submissions are enriched via existing pipeline and require admin approval before going live. See [design doc](docs/designs/2026-03-26-community-shop-submission-design.md).

---

## 8. Monetization & Business Model

**Model:** Phased marketplace monetization — build demand first, then monetize both user and supply sides.

| Phase                    | Timeline           | Trigger                                                         | Revenue source     |
| ------------------------ | ------------------ | --------------------------------------------------------------- | ------------------ |
| Phase 1: Free            | Launch → month 2-3 | N/A                                                             | NT$0               |
| Phase 2: User membership | Month 2-3+         | 100+ WAU AND 20%+ of free users hitting feature caps            | User subscriptions |
| Phase 3: Supply-side     | Month 3-6+         | Inbound "Claim this page" signal + shop traffic is demonstrable | Shop sponsorships  |

**User pricing tiers:**

| Tier             | Price                 | What's included                                                                                         |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| Unauthenticated  | Free                  | Directory, map, shop detail (aggregate data only — no reviews/check-in depth)                           |
| Free (auth-user) | $0                    | Full directory + shop detail, 5 AI searches/day, 3 lists, unlimited check-ins, 10-15 community feed/day |
| Member           | NT$59/mo or NT$449/yr | Unlimited AI search, unlimited lists, full community feed, list export, personalized recs, member badge |

**Shop tiers:**

| Tier      | Price           | What's included                                                                   |
| --------- | --------------- | --------------------------------------------------------------------------------- |
| Unclaimed | Free            | Auto-listed from data pipeline. "Claim this page" badge visible.                  |
| Claimed   | Free            | Owner-verified: update info, basic analytics, review responses, Verified badge    |
| Sponsored | NT$500-1,000/mo | Featured in search results, highlighted in directory _(Phase 3, details: DEV-35)_ |
| Premium   | NT$300-1,000/mo | Full analytics, menu management, event posts _(Phase 3, details: DEV-35)_         |

**Cost structure (rough):** Railway ~$5/mo, Supabase Free → Pro $25/mo, Apify ~$10-30/mo (scraping), Claude Haiku ~$5-20/mo (enrichment), OpenAI embeddings ~$2-5/mo. Total: ~NT$1,500-2,400/month at launch.

**Unit economics:** CAC ~$0 (organic Threads). Break-even: ~25-40 paid members. Lifestyle ceiling: NT$50,000-100,000/month (from ASSUMPTIONS.md). LTV unknown until retention proven.

---

## 9. Market Context

**Market size (rough TAM):** 4,824 coffee shops in Taiwan (Nov 2024), NT$80B+ annual market. Directory ceiling: NT$50K-100K/month at maturity (supply-side monetization). Lifestyle business scale, not venture scale.

**Top competitors:** Cafe Nomad (2,200+ shops, open API, work-mode only, stagnating), Cafeting (best current product, work + productivity, app-only, no web), Thirsty Bean (viral then faded, no retention), Catcha (100 shops, no UGC). Full analysis: [docs/strategy/competitor-analysis.md](docs/strategy/competitor-analysis.md)

---

## 10. Success Metrics (Quantified)

**North Star Metric:** Weekly Active Users (WAU)

- 50+ WAU by end of beta (week 2)
- 300+ WAU by end of month 1
- 1,000+ WAU by month 6

**Supporting metrics:**

- Semantic search "wow rate": 70%+ of beta users say results are better than Google Maps/Cafe Nomad
- Check-in rate: 20%+ of logged-in users check in at least once per month
- Email open rate: 30%+ (industry average 20%)
- Week-4 retention: 40%+ of week-1 users return by week 4
- Membership conversion rate: 3-5% of WAU on paid tier (Phase 2 health signal)
- Feature cap hit rate: 20%+ of free users hitting search or feed caps (Phase 2 launch trigger)

**Minimum Lovable Product threshold:** 20 of 30 beta users say "this is better than anything I've used to find coffee shops in Taiwan."

---

## 11. Appetite

2-4 weeks for V1 build. The 30-shop semantic search prototype must produce "wow" results in week 0 before committing to the full build — this is the FATAL assumption. If fewer than 300 WAU by month 2, reassess distribution strategy. If fewer than 1,000 WAU by month 6, reassess retention mechanics before investing in monetization.
