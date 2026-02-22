# VALIDATION — CafeRoam

_Generated: 2026-02-22 via /validate_
_Upstream: [IDEA-BRIEF.md](./IDEA-BRIEF.md), [MARKET-RESEARCH.md](./MARKET-RESEARCH.md)_

---

## Verdict: GO (with caveats)

The problem is real and well-validated. The competitive positioning (semantic search + multi-mode + web-first) is genuinely differentiated. The market supports a lifestyle business. But three specific risks must be addressed before /scope.

---

## Scorecard

| Dimension | Score (1-10) | Rationale |
|-----------|-------------|-----------|
| Market size | 5 | Taiwan coffee market is NT$80B but a discovery directory captures a fraction. ~4,800 shops × supply-side monetization → NT$50K-100K/month ceiling at maturity. Sufficient for lifestyle business, not venture-scale. |
| Founder/market fit | 6 | Coffee enthusiast with personal pain point and technical skills. Lacks distribution advantage (no influencer connection) and supply-side relationships (no shop owner network). |
| Problem certainty | 8 | Thirsty Bean hit #1 App Store. Threads full of demand. 5+ competitors exist and all leave major gaps. Personal pain point. Strongest dimension. |
| New insight | 5 | "Everyone is work-mode, semantic search is now feasible" is solid but not proprietary. Anyone watching LLMs + this market can see it. No unfair knowledge advantage. |
| Timing | 6 | LLMs make semantic search feasible for solo devs. Competitors stagnating. But window isn't exclusive — Thirsty Bean dev or Cafeting could pivot. |
| **Average** | **6.0** | GO-with-caveats territory |

---

## Problem Analysis

### Problem Validity — CONFIRMED
- Thirsty Bean hit #1 on Taiwan App Store (demand validated at scale)
- Threads is saturated with "where should I go?" questions (recurring demand)
- 5+ competitors exist yet all leave the same gaps (market is underserved despite activity)
- Founder has direct personal experience (authentic understanding)
- User review complaints across all competitors point to the exact gaps CafeRoam targets

### What's Actually Different About CafeRoam
Every competitor clusters in the same quadrant: work-mode + basic filters. CafeRoam targets unoccupied space: multi-mode + semantic search. The differentiation is real but depends entirely on data quality (see risks below).

---

## Risk Assessment

### 1. Data Enrichment — FATAL if unaddressed

Semantic search only works if enriched data (menus, offerings, vibes) exists for enough shops. Cafe Nomad's API provides work-mode attributes only — no menus, no offerings, no atmosphere descriptions.

**The data that powers the wedge feature does not exist in any accessible database.**

For 200 Taipei shops at launch:
- Manual curation: 100+ hours
- Scraping IG/websites: 20-40 hours dev + inconsistent quality
- AI extraction from Google data: 10-20 hours dev, noisy results
- Community contributions: requires users first (chicken-and-egg)

**Required resolution**: Test enrichment on 20-30 shops before building product. If semantic search doesn't produce "wow" results on a small sample, the wedge is broken.

### 2. Retention — SERIOUS

Coffee shop discovery is episodic (1-4 times/month). Without a specific retention mechanic, CafeRoam follows Thirsty Bean's trajectory: viral spike → fade.

No retention mechanic is specified in the plan — it's listed as an "open question."

**Required resolution**: Pick one retention mechanic and build it into v1 as a core feature, not a nice-to-have. Simplest option: weekly curated content (email/push) with personalized picks.

### 3. Distribution from Zero — SERIOUS

"Become the default Threads link" is an outcome, not a strategy. No first-100-users plan exists. Thirsty Bean had a YouTuber connection; Cafe Nomad accumulated SEO over years. CafeRoam starts from zero.

**Required resolution**: Write a specific week-by-week distribution plan for the first month post-launch. Personal Threads posting + coffee community engagement + potential blogger outreach.

### 4. Solo Dev Capacity — MINOR

Building AI semantic search + community features + data pipeline as one person spending "a few hours/week" is realistic for maintenance but not for the intensive launch phase. First 3-6 months will require significantly more than a few hours/week.

### 5. Revenue Timeline — MINOR

$0 for 6+ months is expected for directory businesses. Supply-side monetization (sponsored listings, shop pages) is proven but requires traffic first. No fundamental flaw, but founder must have realistic expectations.

### 6. Competitive Response — MINOR

Thirsty Bean dev appears inactive (no social since May 2025). Cafeting is deepening into productivity, not broadening into discovery. Neither has enriched data. 6-12 month window is realistic but not guaranteed.

---

## Caveat Resolutions (Addressed 2026-02-22)

### Caveat 1: Data Enrichment — RESOLVED
**Strategy**: Outscraper/Apify → scrape Google Maps reviews for Taipei coffee shops → LLM extraction into structured data (menu items, vibe tags, best-for tags, practical info) → manual verification.
**Test plan**: Run pipeline on 30 shops. Success gate: 20+ shops produce 5+ useful structured data points. Estimated time: 4-8 hours.
**Fallback**: Supplement with Cafe Nomad API data (work-mode attributes) + manual enrichment for high-priority shops.

### Caveat 2: Retention — RESOLVED
**V1 retention stack:**
- Weekly curated email (manual curation, low engineering effort)
- Check-in / visited tracking with gamification (AI-generated stamps/collectibles per shop visit — shareable, collection-drive retention)
- Private saved list (simplified — not shareable in v1)
**V2**: Full shareable curated lists (Letterboxd model)

### Caveat 3: Distribution — RESOLVED
**Strategy**: Beta cohort → public launch.
- **Phase 0 (Beta, 2 weeks)**: Recruit 30-50 beta users from personal network + Threads coffee community. Feedback via LINE group. Track: search quality, return rate, data gaps. Success gate: 20+ of 30 say "better than Google Maps/Cafe Nomad."
- **Phase 1 (Public, week 3-4)**: Launch on Threads with beta tester testimonials. Beta users share organically. Reply helpfully to coffee recommendation threads.
- **Phase 2 (Growth, week 5+)**: Coffee blogger/IG outreach. Dev story content. Double down on what drives signups.

---

## Updated Verdict: GO

With caveats resolved, this moves from "GO with caveats" to a clean **GO**. The data enrichment pipeline, retention mechanics, and distribution plan are concrete and testable. Execute the 30-shop data test first — if semantic search produces "wow" results, proceed to build.

---

## What Could Kill This

- Data enrichment proving too expensive / time-consuming for a solo dev → semantic search launches with poor results → users are disappointed → no differentiation from existing tools
- No retention mechanic → same spike-and-fade trajectory as Thirsty Bean
- Thirsty Bean dev ships AI features before CafeRoam launches (unlikely but possible)

---

## What Makes This Worth Doing Despite the Risks

- Problem certainty is an 8/10 — that's rare and valuable
- The competitive white space is genuinely unoccupied (not just "we're slightly better")
- Web-first + shareable links is a structural distribution advantage for Threads
- Cafe Nomad's open API provides a real data bootstrapping shortcut
- LLM tooling has specifically closed the gap that made semantic search infeasible for solo devs
- Lifestyle business goals align with realistic market ceiling
