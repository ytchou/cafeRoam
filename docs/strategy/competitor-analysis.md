# MARKET RESEARCH — CafeRoam

_Generated: 2026-02-22 via /market-research_
_Upstream: [IDEA-BRIEF.md](./IDEA-BRIEF.md)_

---

## Market Overview

### Taiwan Coffee Market (2024-2025)

- **Annual revenue**: NT$80B+ (coffee services alone exceeded NT$40B in 2023, up 36% from 2018)
- **Coffee shops**: 4,824 as of Nov 2024, up 42.5% since 2018
- **Per-capita consumption**: ~184 cups/year, trailing only Japan and South Korea in Asia
- **Growth trend**: Specialty coffee expanding rapidly; new indie brands targeting younger demographics with distinct roasting profiles and in-store experiences
- **Source**: [農業部 (MOA)](https://www.moa.gov.tw/ws.php?id=2500436), [經濟日報](https://money.udn.com/money/story/7307/8512933)

### Demand Signal

- Thirsty Bean (豆好喝) went viral on Threads and hit **#1 on Taiwan App Store** before server collapse — proving massive latent demand for coffee discovery tools
- Threads (Taiwan's fastest-growing social platform) is a major organic channel for coffee shop recommendations — questions about "where to go" routinely get dozens of responses
- User requests across all competitors consistently ask for **more filters, user reviews, and menu-level search** — features nobody currently provides well

---

## Competitor Profiles

### 1. Cafe Nomad (cafenomad.tw)

| Field               | Details                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioning**     | "全台網友推薦的咖啡廳清單，適合工作、看書、喝杯咖啡" — community-recommended cafes for work, reading, coffee                                      |
| **Target audience** | Remote workers, digital nomads, students                                                                                                          |
| **Pricing**         | Free. Open API. Open-source code on [GitHub](https://github.com/howtomakeaturn/cafenomad.tw)                                                      |
| **Data**            | 2,200+ shops, 8 rating dimensions (WiFi stability, seating, quietness, coffee quality, food, pricing, ambiance, WiFi speed)                       |
| **Strengths**       | Largest dataset, open API has spawned an ecosystem (chatbots on LINE/Facebook/Telegram, mobile apps like 找咖啡, wafé, CafeFreelance, CoffeeTrip) |
| **Weaknesses**      | Work-mode only, outdated design, no retention hooks, no semantic search, stagnating development                                                   |
| **Distribution**    | Organic SEO, word of mouth, API ecosystem                                                                                                         |
| **Moat**            | Data breadth + open API ecosystem (but data is commoditized — anyone can access it)                                                               |

**Opportunity**: Cafe Nomad's open API means CafeRoam can bootstrap 2,200+ shops instantly. But Cafe Nomad data is work-mode focused — you'd need to enrich it with menu items, vibes, offerings data.

---

### 2. Cafeting (cafetingapp.com)

| Field               | Details                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioning**     | "精準定位，您的專屬高效率工作空間" — work companion app, not just a directory                                                                                                                                                                                                         |
| **Target audience** | Freelancers, students, remote workers who want a productivity environment                                                                                                                                                                                                             |
| **Pricing**         | Free tier + **NT$60/month or NT$390/year** (~NT$32.5/month). Premium unlocks advanced filters, likely full Pomodoro timer and curated music playlists                                                                                                                                 |
| **Data**            | Unknown exact count. Prices (americano/latte) shown on map. Tags: early bird, late night, outdoor seating, outlet availability                                                                                                                                                        |
| **Strengths**       | Best current product in the space. Modern design. Productivity integration (Pomodoro timer, music playlists). Active development — latest update Feb 14, 2026 (v2.0.3)                                                                                                                |
| **Weaknesses**      | 4.7 stars but only 21 App Store reviews (small user base). **Taipei/New Taipei only**. Dark map UI is hard to read (user complaint). Filter crashes on repeated modification. **No user reviews/comments** — users are asking for this. Native app only (no web, no shareable links). |
| **Distribution**    | App Store organic, likely some Threads/social presence                                                                                                                                                                                                                                |
| **Moat**            | Productivity integration (timer + music) differentiates from pure directories. First-mover on subscription model.                                                                                                                                                                     |

**CafeRoam vs Cafeting**: Not a head-to-head competitor. Cafeting owns "work mode + productivity tool." CafeRoam goes broader (multi-mode) and deeper (semantic search). CafeRoam's web-first approach enables shareable Threads links — a critical distribution advantage Cafeting lacks.

---

### 3. Thirsty Bean / 豆好喝 / 跑咖咖

| Field               | Details                                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioning**     | Practical coffee shop finder covering all of Taiwan                                                                                                                                                                                           |
| **Target audience** | General coffee shop goers, cost-conscious drinkers                                                                                                                                                                                            |
| **Pricing**         | Free                                                                                                                                                                                                                                          |
| **Data**            | All-Taiwan coverage including outlying islands. Shows: shop names, Google ratings, review counts, latte/americano prices on map, outlet availability                                                                                          |
| **Strengths**       | 4.9 stars (50 reviews). All-Taiwan coverage. Viral distribution via Threads (hit #1 App Store). Developer is ex-Google engineer Joel Isaac Kitching (boyfriend of YouTuber 金童 — built-in influencer distribution)                           |
| **Weaknesses**      | Basic directory — no semantic search, no user reviews, no lists. Viral then faded due to **no retention hooks** and **discontinued social media push since May 2025**. Server collapse during viral peak suggests infrastructure limitations. |
| **Distribution**    | Threads viral moment + YouTuber connection                                                                                                                                                                                                    |
| **Moat**            | Developer credentials (ex-Google) + influencer connection. But product is basic and engagement has dropped.                                                                                                                                   |

**Key lesson from Thirsty Bean**: Demand exists. Distribution through Threads works. But a basic directory without retention mechanics will spike and fade. CafeRoam must launch with hooks that keep users returning.

---

### 4. Catcha (catcha-cafes.com)

| Field               | Details                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Positioning**     | Curated map of 100+ Taipei coffee shops                                                                              |
| **Target audience** | Remote workers, freelancers                                                                                          |
| **Pricing**         | Free                                                                                                                 |
| **Strengths**       | Clean modern design with Tailwind CSS, animated UI, curated quality                                                  |
| **Weaknesses**      | Only 100 shops. No UGC. No social features. No clear update cadence. No monetization visible. Likely a side project. |
| **Distribution**    | Unclear — likely organic                                                                                             |
| **Moat**            | None. Small curated dataset, no community, no defensibility.                                                         |

**Relevance to CafeRoam**: Minimal competitive threat. But a good design benchmark — shows what a modern, clean coffee directory can look like.

---

### 5. CAFFÈCOIN (caffecoin)

| Field               | Details                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Positioning**     | "咖啡界歐盟" (the EU of coffee) — stored-value prepaid platform uniting independent coffee shops                                                                                                                |
| **Target audience** | Independent coffee shop customers and shop owners                                                                                                                                                               |
| **Pricing**         | Free for consumers. Stored-value model with bonuses (e.g., deposit NT$500, get NT$100 bonus). Commission/fee structure to shops not publicly disclosed.                                                         |
| **Data**            | 1,000+ partner shops (600+ in Taipei), targeting 5,000+. ~10,000 users targeting 500,000.                                                                                                                       |
| **Strengths**       | Deep shop owner relationships. Handles marketing for shops. Supply chain aggregation (negotiates wholesale pricing). Financial partnerships (bank promotions). Tiered membership system. Trust-backed deposits. |
| **Weaknesses**      | Not a discovery platform — search/filtering is secondary to transactions. No semantic search. No vibe/atmosphere data. Not a competitor in the discovery space.                                                 |
| **Distribution**    | Partnership outreach to shops, consumer growth via promotions                                                                                                                                                   |
| **Moat**            | 1,000+ shop relationships, stored-value trust deposits, supply chain leverage                                                                                                                                   |

**Strategic opportunity for CafeRoam**: CAFFÈCOIN is a **collaborator, not a competitor.** Complementary fit:

- CafeRoam → discovery ("find the right shop")
- CAFFÈCOIN → transactions ("pay/redeem at the shop")
- Potential partnership: CafeRoam links to CAFFÈCOIN for redemption, CAFFÈCOIN features CafeRoam for discovery. Revenue share on referred transactions.
- This is a v2+ opportunity — flag for later.

---

### 6. Global Comparables

#### Beanhunter (beanhunter.com)

- Melbourne-based. 100K+ cafes across 160+ countries.
- Community-driven reviews. Monetizes via coffee subscriptions, equipment e-commerce, job board.
- **No meaningful Taiwan presence.** Clean design but community engagement appears thin outside Australia.

#### Roasters App (roasters.app)

- 21,000+ specialty shops across 125+ countries, 3,100+ cities.
- Shop owners can manage profiles. Focused on specialty coffee.
- **No meaningful Taiwan presence.** Could be a model for shop owner features.

**Relevance**: These show how the coffee discovery category works globally — community reviews + shop owner profiles + discovery. Neither is a threat in Taiwan specifically, but they're useful product references.

---

## Market Positioning Map

```
                    RICH DATA / SEMANTIC
                          ↑
                          |
                    [CafeRoam target]
                          |
          MULTI-MODE ←----+----→ WORK-MODE ONLY
                          |
               [Thirsty   |  [Cafeting]
                Bean]      |  [Cafe Nomad]
                          |  [Catcha]
                          |
                    BASIC FILTERS
```

- **Every existing Taiwan competitor clusters in the bottom-right**: work-mode + basic filters.
- CafeRoam targets **top-left**: multi-mode + rich data / semantic search. Unoccupied space.

---

## Pricing Benchmarks

| Product             | User pricing          | Shop-side monetization                   |
| ------------------- | --------------------- | ---------------------------------------- |
| Cafe Nomad          | Free                  | None visible                             |
| Thirsty Bean        | Free                  | None visible                             |
| Catcha              | Free                  | None visible                             |
| Cafeting            | NT$60/mo or NT$390/yr | None visible (user subscription only)    |
| CAFFÈCOIN           | Free (stored value)   | Commission on transactions (undisclosed) |
| Beanhunter (global) | Free                  | Subscriptions, e-commerce, job board     |
| Roasters (global)   | Free                  | Unclear                                  |

**Market expectation**: Coffee discovery is free for users. Cafeting is the outlier charging users, and they bundle productivity tools to justify it. CafeRoam should be **free for users, monetize supply side**.

---

## Monetization Model (Recommended for CafeRoam)

Based on Yelp (90%+ revenue from business ads), TripAdvisor (referral commissions + meta-search ads), and [directory monetization best practices](https://www.edirectory.com/updates/5-ways-to-monetize-your-online-directory-website/):

### Phase 1: Growth (Months 1-6)

- **Revenue: $0.** Focus entirely on traffic, data quality, and becoming the Threads link.
- Free for all users. Free basic listing for all shops.

### Phase 2: Early Monetization (Months 6-12)

- **Sponsored/featured listings**: Shops pay to appear at top of search results. Target: 20-50 shops × NT$500-1000/month = NT$10K-50K/month.
- **SEO backlinks**: Shops pay for dofollow links from CafeRoam's growing domain authority. NT$500-3000/link.

### Phase 3: Scale Monetization (Year 2+)

- **Premium shop owner pages**: Free listing → paid tier with analytics, menu management, promotion tools, review response. NT$300-1000/month.
- **CAFFÈCOIN integration**: Affiliate commission on referred transactions (5-15%).
- **Display advertising**: Google AdSense or direct ad sales once traffic exceeds 10K monthly visitors.
- **Sponsored content**: "Best coffee shops for [X]" guides with featured placements.

### Revenue benchmarks (from [industry data](https://turnkeydirectories.com/monetize-business-directory/)):

- Small niche directory: $100-500/month
- Established niche directory: $5,000-50,000/month
- Advertising-dependent models need 5,000-10,000+ monthly visitors to be meaningful

---

## Common User Complaints Across All Competitors

These are the patterns that appear in App Store reviews, articles, and user discussions:

1. **"I can't search by what I want to eat/drink"** — no menu-level or offering-level search anywhere
2. **"Only covers Taipei"** — Cafeting is limited; even Cafe Nomad is thin outside major cities
3. **"No user reviews or comments"** — Cafeting users specifically request this
4. **"I want to save lists and share them"** — no competitor has shareable curated lists
5. **"Data is outdated"** — Cafe Nomad suffers from stale information
6. **"I need more than just work mode"** — nobody serves rest, social, or coffee-quality modes well
7. **"I want pet-friendly, dine-in, restroom info"** — users want richer attribute data

**Every one of these is in CafeRoam's target scope.** #1 (semantic search on menus/offerings) is the sharpest wedge — nobody else is even close.

---

## White Space & Opportunities

1. **Semantic / natural-language search** — completely unoccupied. The "basque cake near Zhongshan" query that returns real results would be viral-worthy.
2. **Multi-mode discovery** — nobody serves rest, social, or coffee-quality modes.
3. **Shareable curated lists** — the Letterboxd for coffee shops. Perfect for Threads distribution.
4. **Web-first with shareable links** — every competitor is app-first. A web link you can paste in Threads is a distribution superpower.
5. **Enriched data layer** — menus, offerings, vibes, photos → structured and searchable. This is the moat.
6. **CAFFÈCOIN partnership** — complementary fit for discovery → transactions.

---

## Distribution Channels in This Market

| Channel                 | Evidence                                                           | Relevance to CafeRoam                                                                               |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Threads**             | Thirsty Bean went viral here. Coffee shop questions are constant.  | Primary distribution channel. Shareable web links are critical.                                     |
| **Instagram**           | Coffee shops heavily market on IG. Users share shop photos.        | Secondary — CafeRoam can aggregate IG content as social proof.                                      |
| **App Store organic**   | Thirsty Bean hit #1 organically. Cafeting has steady downloads.    | Important for v2 native app, not v1 web launch.                                                     |
| **PTT**                 | Traditional but declining for younger demographics.                | Low priority.                                                                                       |
| **Word of mouth**       | Cafe Nomad grew primarily this way.                                | Happens naturally if the product is good.                                                           |
| **Influencer/YouTuber** | Thirsty Bean leveraged YouTuber connection for initial viral push. | Worth exploring but not required — CafeRoam's shareable links can go viral organically via Threads. |
| **SEO**                 | Directory sites naturally accumulate search traffic over time.     | Long-term traffic source. Important for monetization phase.                                         |

---

## Key Risks

1. **Thirsty Bean v2**: The ex-Google developer could ship AI features or pivot. They have the engineering talent and influencer distribution. But they've been inactive on social since May 2025 — possible they've moved on.
2. **Cafeting expanding beyond work-mode**: They could add multi-mode discovery and semantic search. But their current trajectory is productivity-tool deepening, not discovery broadening.
3. **Data freshness**: Community-contributed data degrades quickly. Without a strong contribution mechanism, CafeRoam could face the same staleness problem as Cafe Nomad.
4. **CAFFÈCOIN pivoting to discovery**: They have 1,000+ shop relationships. If they built a good discovery layer, they'd have both supply-side relationships and transaction infrastructure. However, their core business is payments — discovery would be a distraction.

---

## Summary: Competitive Advantage Assessment

| Dimension                   | CafeRoam advantage                         | Risk level                                               |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Semantic search             | Strong — nobody has it                     | Low (AI tooling is accessible but enriched data is hard) |
| Multi-mode discovery        | Strong — all competitors are work-mode     | Low (nobody seems to be pivoting)                        |
| Web-first / shareable links | Strong — critical for Threads distribution | Low (architectural choice)                               |
| Community / curated lists   | Planned (v2) — no competitor has this      | Medium (execution dependent)                             |
| Data breadth                | Bootstrappable via Cafe Nomad API          | Medium (enrichment is the real work)                     |
| Shop owner relationships    | Weak — no existing relationships           | High (CAFFÈCOIN has 1000+ already)                       |
| Brand / distribution        | Starting from zero                         | High (need to earn Threads presence organically)         |
