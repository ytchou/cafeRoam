# Project Roadmap: CafeRoam (啡遊)

> For complete product requirements: PRD.md
> For technical decisions: SPEC.md
> Granular task breakdown happens in docs/plans/ after /brainstorming sessions.

---

## Pre-Build: Validate Fatal Assumptions (Week 0)

Must complete BEFORE starting Phase 1. These are FATAL risks from VALIDATION.md — if they fail, stop and reassess before writing product code.

### Data Collection
> **Design Doc:** [docs/designs/2026-02-23-data-collection-pipeline-design.md](docs/designs/2026-02-23-data-collection-pipeline-design.md)
> **Plan:** [docs/plans/2026-02-23-data-collection-pipeline-plan.md](docs/plans/2026-02-23-data-collection-pipeline-plan.md)

**Pipeline Setup:**
- [x] Project setup (package.json, tsconfig, vitest, .gitignore)
- [x] Type definitions (CafeNomadEntry, Pass0/1/2Shop)

**Pipeline Utilities:**
- [x] Filters with TDD (closed, shell, bounds, dedup)
- [x] Matching with TDD (fuzzy name + coordinate proximity)
- [x] Apify client wrapper

**Pipeline Scripts:**
- [x] Pass 0: Cafe Nomad seed (free, ~30s)
- [x] Pass 1: Verify open status via Apify (~$6.40)
- [x] Pass 2: Full scrape with reviews + photos (~$15-18)

**Validation (30-shop subset):**
- [ ] Run Pass 0 on full dataset, pick 30 diverse shops
- [ ] Run Pass 1 on 30 shops, verify >80% match rate
- [ ] Run Pass 2 on confirmed shops, inspect data quality
- [ ] Check: reviews present, photos present, some menu URLs found

### Enrichment & Embeddings
- [ ] Run Claude Haiku enrichment pipeline → extract taxonomy tags from reviews
- [ ] Generate embeddings for 30 enriched shops (OpenAI text-embedding-3-small)

### Search Prototype
- [ ] Build minimal pgvector search prototype
- [ ] Test 10 natural language queries against the prototype

**Pre-build is done when:** 7+ of 10 test queries return useful, relevant results. Beta user reaction (10 people): "this is better than Google Maps." If <7/10 succeed, stop and rethink the data enrichment approach before building the full product.

---

## Phase 1: Foundation — Target: Week 1-2

Core infrastructure everything else depends on. No user-facing product yet.

### Project Setup
> **Design Doc:** [docs/designs/2026-02-23-project-setup-design.md](docs/designs/2026-02-23-project-setup-design.md)
> **Plan:** [docs/plans/2026-02-23-project-setup-plan.md](docs/plans/2026-02-23-project-setup-plan.md)

**Chunk 1 — Scaffold & Config:**
- [x] Generate Next.js 15 scaffold (temp dir)
- [x] Copy configs, merge package.json, install deps
- [x] App shell: root layout + landing page + Tailwind v4 globals
- [x] Initialize shadcn/ui

**Chunk 2 — Routes & Architecture:**
- [ ] Route group skeleton (auth, protected, API stubs)
- [x] Domain types (Shop, User, List, CheckIn, Stamp, Taxonomy)
- [x] Provider interfaces (LLM, Embeddings, Email, Maps, Analytics)
- [ ] Provider adapter stubs + env-based factories
- [ ] Service interface stubs (Search, CheckIn, Lists)
- [x] Supabase client factory (browser + server)

**Chunk 3 — Verification:**
- [ ] Full test suite passes
- [ ] Lint + type-check + production build pass
- [ ] All routes accessible in browser

### Database & Infrastructure
- [ ] Supabase setup: Postgres schema, pgvector extension enabled, RLS policies on all tables
- [ ] Background worker infrastructure: Railway worker setup + cron job scaffold

### Auth & Privacy
- [ ] Auth system: signup (with PDPA consent), login, session management, protected routes
- [ ] PDPA: consent flow at signup, account deletion endpoint (cascades all user data)

### Data Pipeline
- [ ] Taxonomy system: canonical tag table, seeded with 60-100 initial tags across all dimensions
- [ ] Data pipeline: Cafe Nomad importer + Apify scraper integration + Claude Haiku enrichment + embedding generation
- [ ] 200+ Taipei shops enriched, tagged, and embedded in Supabase

### Provider Abstractions
- [ ] Provider abstraction layer: ILLMProvider, IEmbeddingsProvider, IEmailProvider, IMapsProvider, IAnalyticsProvider

### Observability & Ops
- [ ] Sentry + PostHog + UptimeRobot configured
- [ ] Admin/ops tooling: internal dashboard for data quality review and manual shop enrichment

**Phase 1 is done when:** 200+ shops are live in the database with taxonomy tags and embeddings. Auth works end-to-end including PDPA consent and account deletion. Admin can add and edit shop data. `git clone` → running app in under 15 minutes.

---

## Phase 2: Core Product — Target: Week 2-3

The minimum that makes CafeRoam useful to a real user.

### Shop Discovery
- [ ] Shop directory: list view (cards) + map view (Mapbox pins) with toggle
- [ ] Geolocation: "nearby me" — requests location permission, filters shops by proximity
- [ ] Multi-dimension filters: functionality, time, ambience, mode (all powered by taxonomy)
- [ ] Shop detail pages with shareable URLs

### Semantic Search
- [ ] Semantic search: pgvector + taxonomy boost, ChatGPT-style chatbox on landing page
- [ ] Auth gate on semantic search: prompt login when unauthenticated user submits query

### User Lists
- [ ] User lists: create, rename, delete (max 3), add/remove shops

### Check-in & Stamps
- [ ] Check-in system: photo upload (required), text note (optional), menu photo (optional)
- [ ] Menu photo pipeline: optional check-in menu photo → enrichment worker queue
- [ ] Stamp/collectible: one stamp design per shop, earned on check-in

### User Profile
- [ ] Private user profile page: check-in history, stamp collection, lists

### Performance
- [ ] Mobile-first UI polish — design and test at 390px width first
- [ ] Core Web Vitals pass: LCP < 2.5s, CLS < 0.1

**Phase 2 is done when:** A non-team beta user can sign up, complete the PDPA consent flow, search semantically, find a coffee shop, check in with a photo, earn a stamp, and view their profile — all without assistance.

---

## Phase 3: Beta & Launch — Target: Week 3-4

30-50 person beta → public Threads launch.

### Beta Program
- [ ] Recruit 30-50 beta users (personal network + Threads coffee community)
- [ ] LINE group for beta feedback collection
- [ ] Iterate on beta feedback: data gaps, search quality issues, UX friction

### Quality Gate
- [ ] Weekly curated email: template + Railway cron job + Resend integration
- [ ] Map performance audit: test on low-end Android devices
- [ ] Security review: RLS policies, PDPA flow, Sentry error baseline
- [ ] SQL lint passing on all migrations

### Launch
- [ ] Public Threads launch post with beta user testimonials

**Phase 3 is done when:** 20+ of 30 beta users say "better than Google Maps/Cafe Nomad." Public Threads post published. UptimeRobot shows 99%+ uptime during 2-week beta. 50+ WAU achieved.

---

## Backlog (Post-MVP)

Explicitly cut from V1. Revisit after Phase 3 validation data is in hand.

### Social & Community
- [ ] Public user profiles + social check-in feed
- [ ] Shareable curated lists (Letterboxd model: "My top 5 study cafes in Da'an")
- [ ] Comment and review system
- [ ] Community data contributions (flag outdated info, add new shops)

### Monetization & Business
- [ ] Shop owner claiming + premium pages (analytics, menu management)
- [ ] CAFFÈCOIN integration (discovery → transaction affiliate)
- [ ] Sponsored / featured placement monetization

### Growth & Expansion
- [ ] Personalized weekly email (behavior-driven curation)
- [ ] Recommendation engine trained on real usage data
- [ ] Coverage expansion beyond Taipei
- [ ] Native iOS/Android app (after Threads distribution is proven)
