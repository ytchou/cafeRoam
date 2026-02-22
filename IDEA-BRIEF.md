# IDEA BRIEF — CafeRoam (啡遊)

_Generated: 2026-02-22 via /explore_

---

## The Problem

Finding the right coffee shop in Taiwan is genuinely frustrating. Google Maps is crowded with chain stores, SEO-optimized listings, and irrelevant results. Existing specialized tools (Cafe Nomad, Cafeting, Thirsty Bean) are trapped in "work mode" — they answer "where can I use my laptop?" but fail at everything else coffee shop goers care about: vibes, specialty offerings, ambience, social settings.

On Threads (Taiwan's fastest-growing social platform), people constantly ask for coffee shop recommendations. The answers are always Google Maps links or IG marketing posts — scattered, hard to browse, no memory, no intelligence.

The core friction: **coffee shop goers have multiple distinct modes** (work, rest, social gathering, great coffee) and no tool serves all of them well with personalization or semantic intelligence.

---

## The Audience

**Primary:** Coffee shop goers in Taiwan who plan visits intentionally — they're deciding where to go for the next few hours and want to match the shop to their mood/needs.

**Secondary:** Spontaneous visitors who want the best option near them right now.

**Distribution signal:** Highly active on Threads. When someone posts "which coffee shop should I go to in Da'an?" it gets dozens of responses — proving both the demand and the organic sharing channel.

---

## The Existing Landscape

| Product | Status | Strength | Key Gap |
|---------|--------|----------|---------|
| Cafe Nomad | Stagnating (open API) | 2,200+ shops, community data | Work-mode only, outdated UI, no retention |
| Cafeting | Active (2025) | Best current product, good filters | Work-mode only, weak search, no hooks |
| Thirsty Bean (豆好喝) | Viral then faded | Hit #1 App Store via Threads | Basic directory, no retention mechanics |
| Catcha | Niche | Modern design, curated | Only 100 shops, no UGC |
| Google Maps | Dominant | Data breadth | Bad for intentional coffee discovery |

**The gap:** No product has semantic search, multi-mode discovery, AND community-driven engagement in a modern package.

---

## The Vision

**CafeRoam** is the go-to place Taiwanese coffee shop goers share on Threads when someone asks "where should I go?"

It's the intersection of:
- **A smart database** that powers intentional discovery (filter by mode, vibe, offerings)
- **AI semantic search** that understands natural language ("where can I get basque cake with outdoor seating near Zhongshan?")
- **Personalization** that remembers what you like and surfaces better results over time
- **Social curation** (v2) — shareable curated lists, like Letterboxd for coffee shops

The magic moment: you type a natural query, get surprisingly relevant results, the app remembers your preferences, and next time you open it the recommendations feel like they know you.

---

## The Differentiation

**Semantic search is the wedge.** Nobody else has it. It's immediately impressive, shareable ("look what I found with this search"), and hard to replicate quickly because it requires structured enriched data behind it.

No competitor has:
- Menu/offering extraction (the data layer that powers semantic search)
- Multi-mode discovery (not just work mode)
- Personalized recommendations with memory

---

## Business Model (v1 → long-term)

**Revenue paths:**
- Sponsored placements / featured shops
- Backlink packages for shop owners
- Shop owner "claim your page" premium tier (analytics, marketing tools)
- Display advertising once traffic reaches threshold

**Model:** Active lifestyle business — a few hours/week ongoing. Not fully passive. AI and community contributions reduce the data maintenance burden.

---

## Success Criteria (12 months)

- **1,000+ WAU** (weekly active users)
- **Become the default Threads link** when someone asks about coffee shops in Taiwan
- Shop owners start reaching out to claim pages (organic signal of relevance)

---

## Founder Fit

Solo developer, specialty coffee enthusiast with deep personal experience of the pain point. Understands the domain beyond just "where to work" — knows quality, vibes, the culture of Taiwan's independent coffee shop scene. Willing to invest ongoing hours weekly.

---

## Timing: Why Now?

- Thirsty Bean's viral moment proved **massive latent demand** on Threads (hit #1 App Store before server collapse)
- Cafeting is the current best-in-class but **lacks hooks** — users don't return weekly
- Taiwan's coffee market growing fast: 4,824+ shops, NT$80B annual revenue, 42.5% shop growth since 2018
- LLMs make semantic search on unstructured data (menus, descriptions) feasible for a solo developer
- Cafe Nomad's open API provides a **data bootstrapping shortcut** — 2,200+ shops available immediately

---

## V1 Scope (Recommended — 2-4 weeks, solo dev)

**In:**
- Clean, modern directory of Taipei coffee shops (bootstrapped from Cafe Nomad API + manual enrichment)
- Semantic search ("basque cake," "third wave, no time limit," etc.)
- Mode-based quick filters (work / rest / social)
- Simple favorites / saved preferences
- Mobile-responsive web (shareable links for Threads)

**Explicitly out of V1:**
- Native app (web-first)
- Shop owner claiming
- Social/list sharing
- Smart recommendation engine (needs usage data first)
- Coverage outside Taipei

---

## V2 and Beyond

- Shareable curated lists (Letterboxd model: "My top 5 study cafes in Da'an")
- Shop owner pages + claiming
- Community contributions (flag outdated info, add new shops)
- Recommendation engine trained on real usage
- Expand coverage beyond Taipei

---

## Open Questions

1. **Data enrichment strategy:** How to get menu items, specialty offerings, and vibes into the database at scale? Manual curation vs. scraping IG/shop websites vs. community contributions vs. AI-assisted extraction from photos/menus.
2. **Retention mechanics:** What brings a user back weekly if they're not in "I need to find a cafe right now" mode? (Lists, new shop alerts, weekly picks?)
3. **Chinese brand name:** English brand is CafeRoam. Chinese working name 啡遊 (FeiYu) — not finalized.
4. **Distribution playbook:** How do you seed the Threads presence? Personal posting, influencer partnerships, being genuinely helpful in existing Threads threads?

---

## Classification

**Business** — active lifestyle business with passive income potential via ads/sponsorships. Community component is important but not the sole data driver.
