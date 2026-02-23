# Discovery Notes: CafeRoam (啡遊)

> Free-form scratch pad. No required structure. Use this for:
> - Research that doesn't fit neatly into PRD or SPEC
> - User interviews or conversations with potential users
> - Ideas that were explored and rejected (and why)
> - Questions that came up but weren't answered during scoping
> - Links and references worth keeping

---

## 2026-02-22 — Explore + Market Research + Validate Session

**Problem confirmed:** Coffee shop discovery in Taiwan is genuinely broken. Existing tools all serve "work mode" only. Threads is full of people asking "where should I go?" and getting Google Maps links back.

**Thirsty Bean case study:** An ex-Google engineer built a basic directory, a Threads post + YouTuber connection pushed it to #1 on Taiwan App Store — before the server collapsed. Proved: (1) demand is massive, (2) Threads is the distribution channel, (3) a basic directory without retention hooks will spike and fade.

**Key insight from competitive analysis:** Every Taiwan competitor clusters in the same quadrant — work-mode + basic filters. The upper-left quadrant (multi-mode + semantic search) is completely unoccupied. CafeRoam targets this space.

**CAFFÈCOIN is a collaborator, not a competitor.** They own the transaction layer (1,000+ shop relationships, stored-value payments). CafeRoam owns discovery. Potential V2+ integration: CafeRoam links to CAFFÈCOIN for payment, CAFFÈCOIN features CafeRoam for discovery.

---

## 2026-02-23 — Scope Session

**Web-first vs native app debate:** Considered launching both simultaneously. Rejected — distribution strategy is web links on Threads, native app breaks that mechanic. App-first competitors (Cafeting, Thirsty Bean) have no Threads shareability. Web-first is the structural advantage.

**Railway over Vercel:** Vercel is $20/mo (Pro required for commercial use). Railway is ~$5/mo and supports both the Next.js app and background workers on one platform. Chose Railway for cost efficiency and worker support. Full rationale: `docs/decisions/2026-02-23-railway-over-vercel.md`.

**LLM enrichment decision:** Two separate LLM jobs require different models. Enrichment/tagging → Claude Haiku (best at constrained structured extraction, user has Anthropic subscription). Embeddings → OpenAI text-embedding-3-small (most cost-effective, best pgvector ecosystem). Full rationale: `docs/decisions/2026-02-23-llm-enrichment-embeddings.md`.

**Taxonomy system insight:** Rather than free-form LLM output, use a controlled vocabulary (taxonomy table) as constrained output for enrichment. Same taxonomy powers filter UI + search ranking. Adds a new tag → automatically available in filters + future enrichment. This creates a compounding data product.

**Profile page scope:** Originally just check-in stamps. Expanded to include check-in history, stamps, and lists — all data already being built. ~1-2 extra days of frontend work for meaningful retention surface. Included in V1.

**Check-in mechanics:** Required photo (proof of presence) was the key decision. Drives engagement, provides community signal, enables menu data refresh via menu photos. Creates user investment in the product.

---

## Rejected Approaches

| Idea | Why we rejected it |
|------|--------------------|
| Native iOS/Android app in V1 | Breaks Threads distribution mechanic. Web links are the channel. Add native app in V2 after Threads distribution is proven. |
| Vercel for hosting | $20/mo (Pro) required for commercial use. Railway covers Next.js + workers for ~$5/mo. |
| GPT-4o for LLM enrichment | Claude Haiku outperforms on constrained structured extraction (taxonomy mapping). Same cost tier. |
| Shareable lists in V1 | Social layer increases build complexity significantly. Lists are useful privately in V1; sharing is V2. |
| Public user profiles in V1 | Social feed is powerful for engagement but requires content moderation thinking. V2 scope. |
| Google Maps as primary map provider | Mapbox is more customizable and cheaper at scale. Taiwan data quality is comparable. |
| Launching web + native simultaneously | Halves quality of each. Solo dev constraint. Web-first is both the distribution strategy AND the product strategy. |

---

## Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Chinese brand name — 啡遊 (FeiYu) finalized? | Founder | Open |
| Weekly email send day/time — what day works best for Taiwan coffee culture? | Founder | Open (decide in Retention brainstorming) |
| Stamp design approach — illustrated per shop? AI-generated? Generic with shop name? | Founder | Open (decide in Check-in brainstorming) |
| Mapbox vs Google Maps — Taiwan map data quality comparison needed | Founder | Open (test during Phase 1) |
| Apify vs Outscraper for Google Maps scraping — cost and data quality comparison | Founder | Resolved → Apify ($26 vs $101). See docs/decisions/2026-02-23-apify-over-outscraper.md |
| Privacy policy and Terms of Service — draft needed before beta launch | Founder | Open |

---

## Useful References

- Cafe Nomad API: https://cafenomad.tw/api/v1/cafes
- Cafe Nomad GitHub: https://github.com/howtomakeaturn/cafenomad.tw
- CAFFÈCOIN: https://caffecoin.com
- Thirsty Bean / 豆好喝: Threads viral moment May 2025
- Taiwan PDPA (個人資料保護法): https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=I0050021
- pgvector hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- OpenAI text-embedding-3-small pricing: ~$0.02/1M tokens
- Claude Haiku pricing: ~$0.25/MTok input, $1.25/MTok output
