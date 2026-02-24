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

- [x] Run Pass 0 on full dataset, pick 30 diverse shops
- [x] Run Pass 1 on 30 shops, verify >80% match rate
- [x] Run Pass 2 on confirmed shops, inspect data quality
- [x] Check: reviews present, photos present, some menu URLs found

### Enrichment & Embeddings

> **Design Doc:** [docs/designs/2026-02-23-enrichment-embeddings-design.md](docs/designs/2026-02-23-enrichment-embeddings-design.md)
> **Plan:** [docs/plans/2026-02-23-enrichment-embeddings-plan.md](docs/plans/2026-02-23-enrichment-embeddings-plan.md)

**Chunk 1 — Foundation (Wave 1-2):**

- [x] Install SDK dependencies (@anthropic-ai/sdk, openai) and extend pipeline types
- [x] Retry utility with exponential backoff (TDD)
- [x] Cosine similarity utility (TDD)
- [x] Anthropic client wrapper (tool use)
- [x] OpenAI embeddings client wrapper

**Chunk 2 — Enrichment Pipeline (Wave 3):**

- [x] Pass 3a: Taxonomy seed generator — Claude proposes tags from reviews (TDD)
- [x] ✋ Manual: Run pass3a, curate taxonomy-proposed.json → taxonomy.json
- [x] Pass 3b: Enrichment worker — Claude classifies shops against taxonomy (TDD)
- [x] Pass 4: Embedding generator — OpenAI text-embedding-3-small (TDD)

**Chunk 3 — Enrichment Post-Processing:**

> **Design Doc:** [docs/designs/2026-02-23-enrichment-postprocessor-design.md](docs/designs/2026-02-23-enrichment-postprocessor-design.md)
> **Plan:** [docs/plans/2026-02-23-enrichment-postprocessor-plan.md](docs/plans/2026-02-23-enrichment-postprocessor-plan.md)

- [x] Add ProcessedShop types (distinctiveness, multi-mode)
- [x] Pass 3c: IDF computation + tag distinctiveness scoring (TDD)
- [x] Pass 3c: Multi-mode inference tests
- [x] Update Pass 4 to read pass3c-processed.json
- [x] Update Pass 5 to use multi-mode
- [x] Add pnpm script for pass3c

**Chunk 4 — Search Validation:**

- [x] Search queries config (10 test queries)
- [x] Pass 5: Search prototype — cosine similarity + taxonomy boost (TDD)
- [x] Add pnpm scripts for all passes
- [x] ✋ Manual: Run pass3c → pass4 → pass5, score results — 7/10 gate (10/10 achieved 2026-02-23)

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

- [x] Route group skeleton (auth, protected, API stubs)
- [x] Domain types (Shop, User, List, CheckIn, Stamp, Taxonomy)
- [x] Provider interfaces (LLM, Embeddings, Email, Maps, Analytics)
- [x] Provider adapter stubs + env-based factories
- [x] Service interface stubs (Search, CheckIn, Lists)
- [x] Supabase client factory (browser + server)

**Chunk 3 — Verification:**

- [x] Full test suite passes
- [x] Lint + type-check + production build pass
- [x] All routes accessible in browser

### Database Schema + Code Review Chunk 1 & 2

> **Design Doc:** [docs/designs/2026-02-25-db-schema-and-code-review-chunk1-2-design.md](docs/designs/2026-02-25-db-schema-and-code-review-chunk1-2-design.md)
> **Plan:** [docs/plans/2026-02-25-db-schema-and-code-review-chunk1-2-plan.md](docs/plans/2026-02-25-db-schema-and-code-review-chunk1-2-plan.md)
> **Original DB Design:** [docs/designs/2026-02-24-db-infrastructure-design.md](docs/designs/2026-02-24-db-infrastructure-design.md)

**Chunk 1 — Migration Files (Wave 1):**
- [x] Copy 9 migration files from feat/db-infrastructure (fix job_queue columns, triggers, RPC)
- [x] Add DEAD_LETTER to JobStatus enum + widen Job.payload

**Chunk 2 — Per-Request JWT Auth (Wave 2-4):**
- [x] Refactor supabase_client.py (per-request JWT + service role singleton)
- [ ] Add get_user_db FastAPI dependency
- [ ] Wire all auth routes to per-request JWT client

**Chunk 3 — Service Simplification (Wave 5-6):**
- [ ] Simplify CheckInService (trigger handles stamp + job)
- [ ] Simplify ListsService (trigger cap + RLS ownership)
- [ ] Update list route handlers for simplified signatures

**Chunk 4 — Verification (Wave 7):**
- [ ] All tests pass, lint, type-check, build

### Python Backend Migration

> **Design Doc:** [docs/designs/2026-02-24-python-backend-migration-design.md](docs/designs/2026-02-24-python-backend-migration-design.md)
> **Plan:** [docs/plans/2026-02-24-python-backend-migration-plan.md](docs/plans/2026-02-24-python-backend-migration-plan.md)
> **Supersedes:** DB Infrastructure Plan Tasks 6+ (TypeScript workers, providers, handlers)

**Chunk 1 — Python Project Foundation (Wave 1-2):**

- [x] Python project scaffolding (pyproject.toml, config, test infra)
- [x] Pydantic domain models (translate TypeScript types)
- [x] Supabase Python client (singleton with service role)

**Chunk 2 — Provider Layer (Wave 3):**

- [x] Provider protocols (LLM, Embeddings, Email, Analytics, Maps)
- [x] Provider adapters + factory functions with TDD

**Chunk 3 — Services (Wave 4):**

- [x] Search service with TDD (vector similarity + taxonomy boost)
- [x] Check-in service with TDD (photo requirement, stamp award, menu photo queue)
- [x] Lists service with TDD (3-list cap enforcement)

**Chunk 4 — API & Workers (Wave 4-5):**

- [x] FastAPI app + JWT auth dependency with TDD
- [x] API routes (shops, search, checkins, lists, stamps)
- [x] Job queue consumer with TDD (FOR UPDATE SKIP LOCKED)
- [x] Worker handlers + APScheduler (enrich, embed, menu, staleness, email)

**Chunk 5 — Frontend Proxies & Cleanup (Wave 6-7):**

- [x] Rewrite Next.js API routes as thin proxies
- [x] Delete old TypeScript backend code (lib/providers, lib/services, lib/db, workers)
- [x] Backend Dockerfile + update package.json scripts

**Chunk 6 — Verification:**

- [x] All backend tests pass (pytest)
- [x] All frontend tests pass (vitest)
- [x] Frontend build passes (pnpm build)
- [x] ruff + mypy pass on backend

### Code Review Fixes (Python Backend)

> **Design Doc:** [docs/designs/2026-02-24-code-review-fixes-design.md](docs/designs/2026-02-24-code-review-fixes-design.md)
> **Plan:** [docs/plans/2026-02-24-code-review-fixes-plan.md](docs/plans/2026-02-24-code-review-fixes-plan.md)

**Chunk 1 — Auth/Authorization (Critical):** → Moved to "Database Schema + Code Review Chunk 1 & 2" above

**Chunk 2 — Transaction Safety (Critical/Important):** → Moved to "Database Schema + Code Review Chunk 1 & 2" above

**Chunk 3 — Data Integrity (Critical):**

- [x] Job queue retry with exponential backoff
- [x] Fix enriched_at string literal to real timestamp

**Chunk 4 — Infrastructure (Important):**

- [x] Resend email adapter: async thread wrapper + fix global state
- [x] Job.payload type widen to Any + search row.pop fix
- [x] Proxy content type forwarding
- [x] Missing list sub-resource proxy routes
- [x] Auth route (backend + frontend)
- [x] Dockerfile uv.lock fix + posthog dependency

**Chunk 5 — Tests + Verification:**

- [x] Missing handler tests (enrich_menu_photo, weekly_email)
- [x] All backend tests pass (pytest)
- [x] All frontend tests pass (vitest)
- [x] ruff + mypy pass

### Auth & Privacy

- [ ] Auth system: signup (with PDPA consent), login, session management, protected routes
- [ ] PDPA: consent flow at signup, account deletion endpoint (cascades all user data)

### Data Pipeline

- [ ] Taxonomy system: canonical tag table, seeded with 60-100 initial tags across all dimensions
- [ ] Data pipeline: Cafe Nomad importer + Apify scraper integration + Claude Sonnet enrichment + embedding generation (see [ADR](docs/decisions/2026-02-24-enrichment-model-sonnet-over-haiku.md))
- [ ] 200+ Taipei shops enriched, tagged, and embedded in Supabase
- [ ] Enrichment staleness tracking: store `enrichedAt` per shop, background job flags shops older than 90 days for re-enrichment
- [ ] Incremental tag classification: re-classify only delta tags when taxonomy grows, not full re-enrichment (build before catalog exceeds 500 shops)
- [ ] Embedding regeneration trigger: re-embed only when enrichment actually changes (diff tags/summary), not on every pipeline run

### Provider Abstractions

- [ ] Provider abstraction layer: LLMProvider, EmbeddingsProvider, EmailProvider, MapsProvider, AnalyticsProvider (Python Protocol classes — covered in Python Backend Migration above)

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
