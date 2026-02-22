# Assumptions Register: CafeRoam (啡遊)

> Created: 2026-02-22 (via /validate)
> Updated: 2026-02-23 (extended by /scope)
> Source: /validate → extended by /scope

---

## Section 1: Core Assumptions (from /validate)

| # | Assumption | Confidence | Evidence | Likelihood Wrong | Impact if Wrong | Validate by |
|---|---|---|---|---|---|---|
| 1 | Semantic search on enriched coffee shop data will produce a "wow" moment | Low | LLMs handle natural language well; semantic search on structured data is solved technically | Medium | FATAL — wedge is broken without this | Pre-build week 0: test 10 queries against 30-shop prototype |
| 2 | Enriched data (menus, offerings, vibes) can be obtained at scale for Taipei shops | Low | Google Maps reviews contain this info; AI can assist extraction | Medium | FATAL — no enriched data = no semantic search | Pre-build week 0: run pipeline on 30 shops, measure time per shop |
| 3 | Users will return to a coffee discovery tool weekly (1,000+ WAU) | Low | Coffee is a daily habit; Threads discussions are constant | Medium | Serious — spike-and-fade trajectory | 4-6 weeks post-launch: track week-4 retention rate |
| 4 | Threads is a viable primary distribution channel for organic growth | Medium | Thirsty Bean went viral here; coffee questions get dozens of responses | Low | Serious — no distribution backup plan | Post-launch: post 10 Threads replies with CafeRoam links, measure CTR |
| 5 | Multi-mode discovery (work/rest/social) is a real differentiator users care about | Medium | Users ask for different types of shops on Threads; all competitors are work-mode only | Low | Serious — if users think in attributes not modes, rethink UX | Beta: ask 10 users how they describe what they're looking for |
| 6 | Coffee shop owners will pay for sponsored listings once CafeRoam has traffic | Medium | Yelp model works; shops actively spend on IG marketing | Low | Minor — affects monetization, not product viability | 6-12 months post-launch: offer sponsored placements to 10 shops |
| 7 | Cafe Nomad's open API data is reliable enough for bootstrapping | High | Multiple apps already use it successfully | Low | Minor — alternative data sources exist | Day 1 of pre-build: spot-check 20 shops |
| 8 | A solo developer can build, launch, and maintain this in 2-4 weeks | Low-Medium | Modern frameworks + AI coding tools accelerate development; web-first reduces platform complexity | Medium | Serious — timeline may need extension | During /scope: task breakdown confirms. Data enrichment time is the key variable. |

---

## Section 2: User Assumptions (from /validate)

| # | Assumption | Confidence | Evidence | Likelihood Wrong | Impact if Wrong | Validate by |
|---|---|---|---|---|---|---|
| U1 | Users want to discover coffee shops by mode (work/rest/social), not just by attributes | Medium | Threads discussions show different intent types; personal pain point | Medium | Medium — may need to rethink filter UX to lead with attributes | Beta: observe how users describe their search intent |
| U2 | Check-in with photo upload won't be perceived as too much friction | Medium | Instagram culture in Taiwan = photo sharing is normal behavior | Medium | Medium — simplify to optional photo if friction is too high | Beta: track check-in completion rate; >40% = acceptable |
| U3 | Private lists (not shareable in V1) are still valuable enough to drive retention | Medium | Lists for personal tracking is a common behavior (Notion, notes apps) | Low | Low — shareable lists (V2) would address this if wrong | Beta: track list creation rate |

---

## Section 3: Technical Assumptions (added by /scope)

| # | Assumption | Confidence | Evidence | Likelihood Wrong | Impact if Wrong | Validate by |
|---|---|---|---|---|---|---|
| T1 | pgvector hybrid search (vector similarity + taxonomy boost) produces better results than pure vector search | Medium | Hybrid search is well-established; taxonomy handles attribute queries that pure vector struggles with | Low | Medium — if pure vector is sufficient, taxonomy boost adds complexity without benefit | Pre-build: compare pure vector vs hybrid on same 10 queries |
| T2 | Claude Haiku can accurately map unstructured Google Maps reviews to taxonomy tags with constrained-output prompting | Medium | Claude is strong at instruction-following for constrained outputs; validated conceptually | Low | High — enrichment quality determines search quality | Pre-build: run 30-shop enrichment, manually verify tag accuracy |
| T3 | OpenAI text-embedding-3-small produces sufficient embedding quality for coffee shop semantic search | Medium | Widely used for domain-specific search; excellent pgvector ecosystem support | Low | Medium — swap to Google text-embedding-004 if quality insufficient | Pre-build: test on 30-shop prototype |
| T4 | Mapbox GL JS performs acceptably on low-end Android devices in Taiwan | Low | Taiwan Android market includes budget devices; Mapbox can be heavy | Medium | Medium — degrade gracefully to list view on low-end devices | Phase 2: test on ~2GB RAM Android device |
| T5 | Railway supports Next.js App Router + background workers without significant DX friction | Medium | Railway supports Node.js; Next.js on Railway is documented | Low | Low — Vercel is the fallback | Phase 1: first deployment |
| T6 | A 60-100 tag taxonomy is sufficient to power meaningful filter UI and search ranking | Low | Estimated from competitive filter analysis; no prototype data | Medium | Medium — may need more tags or different hierarchy | Phase 1: seed taxonomy, run against 200 shops, measure tag coverage |

---

## Section 4: Business Assumptions

| # | Assumption | Confidence | Evidence | Likelihood Wrong | Impact if Wrong | Validate by |
|---|---|---|---|---|---|---|
| B1 | The lifestyle business ceiling (NT$50K-100K/month) is acceptable and achievable | High | Pricing benchmarks from Yelp model; Taiwan directory market data | Low | Minor — adjust expectations if ceiling is lower | Year 1: sponsored listing conversion rate |
| B2 | CAFFÈCOIN is a collaborator (not competitor) and a V2+ partnership is viable | Medium | Complementary positioning; both benefit from integration | Low | Minor — if CAFFÈCOIN builds discovery, they become a competitor | Year 1: monitor CAFFÈCOIN product roadmap |
| B3 | The 30-50 person beta cohort can be recruited from personal network + Threads coffee community | Medium | Personal network in Taiwan + active Threads coffee presence | Low | Medium — if cohort is hard to recruit, beta validation is delayed | Week 0: attempt recruitment before building |

---

## Risks

| Risk | Probability | Impact | Mitigation | Status |
|---|---|---|---|---|
| Semantic search launches with poor results → no "wow" moment → no differentiation | Medium | Fatal | Pre-build 30-shop prototype must hit 7/10 query success gate before proceeding | Active |
| Data enrichment proves too expensive or slow for solo dev | Medium | Fatal | Time-box enrichment test in week 0; if >30 min/shop, rethink pipeline | Active |
| Thirsty Bean dev ships AI features before CafeRoam launches | Low | High | Inactive since May 2025; build quickly | Active |
| Cafeting expands from work-mode to multi-mode discovery | Low | Medium | They're doubling down on productivity; monitor but don't block on it | Active |
| Mapbox GL JS too heavy for low-end Android devices | Medium | Medium | Test early Phase 2; degrade gracefully to list view | Active |
| Threads link clicks don't convert to signups | Medium | High | Monitor Threads CTR during beta; if <2% CTR, rethink posting strategy | Active |
| PDPA compliance gap found post-launch | Low | High | Build consent flow + account deletion before any public access | Active |

**Probability/Impact scale:** High (>50% / business-threatening), Medium (20-50% / major delay or pivot), Low (<20% / manageable)

---

## Invalidated Assumptions

| Assumption | Why it was wrong | Impact | Date |
|---|---|---|---|
| — | — | — | — |
