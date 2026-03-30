# Project Roadmap: CafeRoam (啡遊)

> For complete product requirements: PRD.md
> For technical decisions: SPEC.md
> Granular task breakdown happens in docs/plans/ after /brainstorming sessions.

---

## Mapbox Performance Validation + Graceful Degradation (DEV-75)

> **Design Doc:** [docs/designs/2026-03-30-mapbox-performance-validation-design.md](docs/designs/2026-03-30-mapbox-performance-validation-design.md)
> **Plan:** [docs/plans/2026-03-30-mapbox-performance-validation-plan.md](docs/plans/2026-03-30-mapbox-performance-validation-plan.md)

**Wave 1 — Hook + Perf Script (parallel):**

- [ ] Task 1: Write `useDeviceCapability` hook failing test (DEV-107)
- [ ] Task 2: Implement `useDeviceCapability` hook (DEV-107)
- [ ] Task 7: Create Playwright map performance test script (DEV-109)

**Wave 2 — MapWithFallback Component:**

- [ ] Task 3: Write `MapWithFallback` failing test (DEV-108)
- [ ] Task 4: Implement `MapWithFallback` component (DEV-108)

**Wave 3 — Integration + Validation:**

- [ ] Task 5: Write Find page integration failing test (DEV-108)
- [ ] Task 6: Integrate `MapWithFallback` into `app/page.tsx` (DEV-108)
- [ ] Task 8: Run performance validation + update ASSUMPTION T4 (DEV-110)

---

## Bootstrap Supabase Staging (DEV-71)

> **Design Doc:** [docs/designs/2026-03-29-supabase-staging-bootstrap-design.md](docs/designs/2026-03-29-supabase-staging-bootstrap-design.md)
> **Plan:** [docs/plans/2026-03-29-supabase-staging-bootstrap-plan.md](docs/plans/2026-03-29-supabase-staging-bootstrap-plan.md)

**Wave 1 — Setup (parallel):**

- [x] Task 1: Install Railway CLI and authenticate (DEV-77)
- [x] Task 2: Create Supabase staging project via dashboard (DEV-78)

**Wave 2 — Schema + Auth (parallel):**

- [x] Task 3: Push all 78 migrations to staging (DEV-79)
- [x] Task 5: Configure staging Auth (DEV-81)

**Wave 3 — Data + Wiring (parallel):**

- [x] Task 4: Seed staging DB with 164 shops + admin user (DEV-80)
- [x] Task 6: Wire credentials to Railway + 1Password (DEV-82)

**Wave 4 — Verify:**

- [x] Task 7: Full verification — schema parity, storage, auth, seed data (DEV-83)

---

## Validate Supabase Cloud Migration Parity (DEV-72)

> **Design Doc:** [docs/designs/2026-03-30-supabase-cloud-migration-parity-design.md](docs/designs/2026-03-30-supabase-cloud-migration-parity-design.md)
> **Plan:** [docs/plans/2026-03-30-supabase-cloud-migration-parity-plan.md](docs/plans/2026-03-30-supabase-cloud-migration-parity-plan.md)

**Wave 1 — Foundation:**

- [x] Task 1: Script skeleton + schema parity check (DEV-86)

**Wave 2 — Core checks (parallel):**

- [x] Task 2: RLS validation check (DEV-86)
- [x] Task 3: Trigger validation check (DEV-86)

**Wave 3 — Additional checks (parallel):**

- [x] Task 4: pgvector validation check (DEV-86)
- [x] Task 5: pgBouncer compatibility check (DEV-86)
- [x] Task 6: Storage bucket check (DEV-86)

**Wave 4 — Integration:**

- [x] Task 7: Integration test against local + Makefile target (DEV-86)

**Wave 5 — Operational:**

- [x] Task 8: Close DEV-87 (pgBouncer verified safe) + run against staging (DEV-88)

---

## Fix BottomNav Overlay on Map View (DEV-85)

> **Design Doc:** [docs/designs/2026-03-29-dev-85-bottomnav-overlay-fix-design.md](docs/designs/2026-03-29-dev-85-bottomnav-overlay-fix-design.md)
> **Plan:** [docs/plans/2026-03-29-dev-85-bottomnav-overlay-fix-plan.md](docs/plans/2026-03-29-dev-85-bottomnav-overlay-fix-plan.md)

**Chunk 1 — BottomNav embedded prop (Waves 1-4):**

- [x] Task 1: Write failing test for embedded BottomNav variant
- [x] Task 2: Implement the `embedded` prop on BottomNav
- [x] Task 3: Pass `embedded` in MapMobileLayout
- [x] Task 4: Lint and commit

---

## Fix Shop Card Navigation (DEV-84)

> **Design Doc:** [docs/designs/2026-03-29-fix-shop-card-navigation-design.md](docs/designs/2026-03-29-fix-shop-card-navigation-design.md)
> **Plan:** [docs/plans/2026-03-29-fix-shop-card-navigation-plan.md](docs/plans/2026-03-29-fix-shop-card-navigation-plan.md)

**Chunk 1 — Redirect Route (Waves 1-3):**

- [x] Task 1: Write failing test for shop ID redirect route
- [x] Task 2: Implement the redirect route
- [x] Task 3: Lint and commit

---

## Home Page Fixes — Card Navigation + Taxonomy Tags

> **Design Doc:** [docs/designs/2026-03-28-home-page-fixes-design.md](docs/designs/2026-03-28-home-page-fixes-design.md)
> **Plan:** [docs/plans/2026-03-28-home-page-fixes-plan.md](docs/plans/2026-03-28-home-page-fixes-plan.md)

**Chunk 1 — Taxonomy Tag Pills (Waves 1-2):**

- [x] Task 1: Write failing tests for taxonomy tag pills
- [x] Task 2: Implement taxonomy tag pills on ShopCardCompact

**Chunk 2 — Card Navigation Fix (Waves 1-4):**

- [x] Task 3: Write failing test for onCardClick on MapDesktopLayout
- [x] Task 4: Implement onCardClick on MapDesktopLayout
- [x] Task 5: Add onCardClick to ShopCarousel + MapMobileLayout
- [x] Task 6: Wire onCardClick in page.tsx

---

## Cancel-Deletion 500 Fix (DEV-64)

> **Plan:** [docs/plans/2026-03-27-cancel-deletion-500-plan.md](docs/plans/2026-03-27-cancel-deletion-500-plan.md)

**Chunk 1 — Backend Fix (Waves 1-3):**

- [x] Task 1: Update test overrides for `get_current_user_allow_pending`
- [x] Task 2: Write failing tests for admin SDK error resilience
- [x] Task 3: Add error handling around admin SDK calls

**Chunk 2 — Frontend + E2E + Auth Dep (Waves 1, 4):**

- [x] Task 4: Commit frontend + E2E fixture changes
- [x] Task 5: Commit auth dependency change + full test suite pass

## Owner Dashboard + Shop Story (DEV-21)

> **Design Doc:** [docs/designs/2026-03-27-owner-dashboard-design.md](docs/designs/2026-03-27-owner-dashboard-design.md)
> **Plan:** [docs/plans/2026-03-27-owner-dashboard-plan.md](docs/plans/2026-03-27-owner-dashboard-plan.md)
> **Depends on:** DEV-45 (merged ✓)

**Chunk 1 — Migrations + Foundation (Wave 1):**

- [x] Task 1: `shop_content` migration
- [x] Task 2: `shop_owner_tags` migration
- [x] Task 3: `review_responses` migration
- [x] Task 4: `require_shop_owner` dependency
- [x] Task 5: Pydantic models
- [x] Task 16: Config + doctor + PDPA cascade

**Chunk 2 — Backend Service (Wave 2):**

- [x] Task 6: Service — stats + analytics (PostHog HogQL)
- [x] Task 7: Service — story CRUD + shop info + tags
- [x] Task 8: Service — reviews + responses
- [x] Task 10: Extend `/shops/{id}` with ownerStory

**Chunk 3 — API + Proxies (Wave 3):**

- [x] Task 9: API router (9 endpoints, owner-scoped)
- [x] Task 11: Next.js proxy routes

**Chunk 4 — Frontend (Waves 4–5):**

- [x] Task 12: SWR hooks (useOwnerDashboard, useOwnerContent, useOwnerReviews)
- [x] Task 13: OwnerStory component on shop detail page
- [x] Task 14: Dashboard page + section components

**Chunk 5 — E2E (Wave 6):**

- [x] Task 15: E2E owner dashboard journey

---

## Shop Claim Flow + Verified Badge (DEV-45)

> **Design Doc:** [docs/designs/2026-03-26-shop-claim-flow-design.md](docs/designs/2026-03-26-shop-claim-flow-design.md)
> **Plan:** [docs/plans/2026-03-26-shop-claim-flow-plan.md](docs/plans/2026-03-26-shop-claim-flow-plan.md)

**Chunk 1 — DB + Backend Types (Wave 1):**

- [x] Task 1: user_roles migration (paid_user→member, add shop_owner)
- [x] Task 2: shop_claims table migration + Storage bucket
- [x] Task 3: Audit and replace paid_user in backend code
- [x] Task 4: Add Claim Pydantic types to models/types.py

**Chunk 2 — Backend Services + API (Waves 2–4):**

- [x] Task 5: ClaimsService with TDD (submit, approve, reject)
- [x] Task 6: Add claimStatus to GET /shops/:id response
- [x] Task 7: Claims API router (upload-url, submit, me)
- [x] Task 8: Admin Claims API (list, proof-url, approve, reject)
- [x] Task 9: Register routers in main.py

**Chunk 3 — Frontend Proxies + Components (Waves 5–7):**

- [x] Task 10: Next.js proxy routes for claims
- [x] Task 11: Next.js proxy routes for admin claims
- [x] Task 12: VerifiedBadge component
- [x] Task 13: Update ClaimBanner + ShopData type
- [x] Task 14: Claim form page (/shops/[shopId]/claim)
- [x] Task 15: Admin Claims tab in /admin panel

**Chunk 4 — E2E (Wave 8):**

- [x] Task 16: E2E claim flow journey (J15)

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
- [x] Add get_user_db FastAPI dependency
- [x] Wire all auth routes to per-request JWT client

**Chunk 3 — Service Simplification (Wave 5-6):**

- [x] Simplify CheckInService (trigger handles stamp + job)
- [x] Simplify ListsService (trigger cap + RLS ownership)
- [x] Update list route handlers for simplified signatures

**Chunk 4 — Verification (Wave 7):**

- [x] All tests pass, lint, type-check, build

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

> **Design Doc:** [docs/designs/2026-02-25-auth-privacy-design.md](docs/designs/2026-02-25-auth-privacy-design.md)
> **Plan:** [docs/plans/2026-02-25-auth-privacy-plan.md](docs/plans/2026-02-25-auth-privacy-plan.md)

**Chunk 1 — DB Migrations (Wave 1-2):**

- [x] Add `deletion_requested_at` column to profiles
- [x] Custom JWT claim hook for PDPA consent + deletion status

**Chunk 2 — Backend Auth Routes (Wave 3):**

- [x] `POST /auth/consent` — record PDPA consent with TDD
- [x] `DELETE /auth/account` — initiate 30-day soft delete with TDD
- [x] `POST /auth/cancel-deletion` — cancel within grace period with TDD
- [x] Account deletion scheduler (daily cleanup job) with TDD

**Chunk 3 — Frontend Infra (Wave 3-4):**

- [x] Supabase SSR client setup (browser, server, middleware helpers)
- [x] Next.js middleware (route guards: public / onboarding / protected / recovery)

**Chunk 4 — Frontend Auth Pages (Wave 5):**

- [x] Login page (email/password + Google + LINE) with tests
- [x] Signup page (email/password + PDPA checkbox) with tests
- [x] Auth callback route (code exchange + consent check)
- [x] PDPA consent page with tests
- [x] Account recovery page with tests
- [x] Settings page (logout + account deletion)
- [x] Auth proxy routes (consent, delete, cancel-deletion)

**Chunk 5 — Verification (Wave 6):**

- [x] All backend tests pass (pytest)
- [x] All frontend tests pass (vitest)
- [x] Frontend lint, type-check, build pass

### Data Pipeline

> **Design Doc:** [docs/designs/2026-02-26-data-pipeline-design.md](docs/designs/2026-02-26-data-pipeline-design.md)
> **Plan:** [docs/plans/2026-02-26-data-pipeline-plan.md](docs/plans/2026-02-26-data-pipeline-plan.md)

**Chunk 1 — DB Migrations + Models (Wave 1-2):**

- [x] DB migrations: shop_submissions, activity_feed, find_stale_shops RPC, pipeline columns
- [x] Pydantic models: ShopSubmission, ActivityFeedEvent, ProcessingStatus, new JobTypes

**Chunk 2 — Scraper Provider + Handlers (Wave 2-3):**

- [x] Apify scraper provider (ScraperProvider protocol + ApifyScraperAdapter)
- [x] SCRAPE_SHOP handler (Apify scrape → store → chain to ENRICH_SHOP)
- [x] PUBLISH_SHOP handler (set live → activity feed → flag for admin)

**Chunk 3 — Wiring + API Routes (Wave 4-5):**

- [x] Wire new handlers into scheduler dispatch loop
- [x] POST /submissions API route (user shop submission)

### Photo Classification (DEV-18)

> **Design Doc:** [docs/designs/2026-03-25-dev18-photo-classification-design.md](docs/designs/2026-03-25-dev18-photo-classification-design.md)
> **Plan:** [docs/plans/2026-03-25-photo-classification-plan.md](docs/plans/2026-03-25-photo-classification-plan.md)

**Chunk 1 — Foundation (Wave 1-2):**

- [x] DB migration: `uploaded_at` column on `shop_photos`
- [x] Model types: `PhotoCategory`, `ScrapedPhotoData`, `CLASSIFY_SHOP_PHOTOS` job type
- [x] Apify adapter: parse `images[]` with age filter + cap 30 + fallback
- [x] LLM provider: `classify_photo` method with Haiku + tool use

**Chunk 2 — Pipeline Integration (Wave 3-4):**

- [x] Persist layer: write `uploaded_at`, enqueue classification job
- [x] Classification handler: thumbnail rewrite → Vision → update category + is_menu + cap enforcement
- [x] Scheduler: register `CLASSIFY_SHOP_PHOTOS` dispatch
- [x] GET /feed API route (public community activity feed)
- [x] Admin dashboard API (overview, dead-letter, retry, reject)

**Chunk 4 — Pipeline Features (Wave 4-5):**

- [x] Search service: IDF taxonomy boost + mode pre-filter
- [x] Smart staleness sweep (only re-enrich when new reviews detected)
- [x] Cold start importers (Google Takeout parser + Cafe Nomad fetcher)
- [x] Propagate submission_id through ENRICH → EMBED → PUBLISH chain

**Chunk 5 — Verification (Wave 6):**

- [x] All backend tests pass (pytest)
- [x] ruff + mypy pass
- [x] Frontend tests + build pass

### Provider Abstractions

> **Design Doc:** [docs/designs/2026-02-26-provider-adapter-implementations-design.md](docs/designs/2026-02-26-provider-adapter-implementations-design.md)
> **Plan:** [docs/plans/2026-02-26-provider-adapter-implementations-plan.md](docs/plans/2026-02-26-provider-adapter-implementations-plan.md)

**Chunk 1 — Models & Interface (Wave 1):**

- [x] Add ShopEnrichmentInput model to types.py
- [x] Update LLM protocol interface signature

**Chunk 2 — Adapter Implementations (Wave 1-2):**

- [x] Implement Anthropic adapter enrich_shop with TDD
- [x] Add extract_menu_data tests for Anthropic adapter
- [x] Implement Mapbox geocoding adapter with TDD
- [x] Implement PostHog analytics adapter with TDD

**Chunk 3 — Wiring & Verification (Wave 3-5):**

- [x] Update LLM factory for taxonomy parameter
- [x] Add missing Maps + Analytics factory tests
- [x] Update worker handlers for new enrich_shop signature
- [x] Full verification (pytest, ruff, mypy, pnpm test)

### Observability & Ops

> **Design Doc:** [docs/designs/2026-02-27-observability-ops-design.md](docs/designs/2026-02-27-observability-ops-design.md)
> **Plan:** [docs/plans/2026-02-27-observability-ops-plan.md](docs/plans/2026-02-27-observability-ops-plan.md)

**Chunk 1 — Backend Observability (Wave 1):**

- [x] Sentry backend initialization (DSN-gated, environment context)
- [x] Request ID middleware (UUID per request, structured logging)
- [x] Deep health check endpoint (/health/deep with DB validation)

**Chunk 2 — Frontend Observability (Wave 1):**

- [x] Sentry frontend initialization (@sentry/nextjs, source maps)
- [x] PostHog frontend provider (posthog-js, DNT respect)
- [x] Environment variable documentation

**Chunk 3 — Worker Integration (Wave 2):**

- [x] Worker Sentry integration (capture job failures with context)

**Chunk 4 — Verification & Ops (Wave 3):**

- [x] Full test suite verification (backend + frontend)
- [x] Better Stack setup guide (manual external configuration)

### Admin Dashboard

> **Design Doc:** [docs/designs/2026-03-02-admin-dashboard-design.md](docs/designs/2026-03-02-admin-dashboard-design.md)
> **Plan:** [docs/plans/2026-03-02-admin-dashboard-plan.md](docs/plans/2026-03-02-admin-dashboard-plan.md)

**Chunk 1 — DB + Audit (Wave 1-2):**

- [x] DB migration: `manually_edited_at` column + `admin_audit_logs` table + low-confidence RPC
- [x] Audit log utility (`log_admin_action`) with TDD

**Chunk 2 — Backend API (Wave 3):**

- [x] Admin shops router: list, create, detail, update, enqueue, search-rank with TDD
- [x] Admin jobs router: list all + cancel endpoint with TDD
- [x] Admin taxonomy router: coverage stats endpoint with TDD
- [x] Backend verification (pytest, ruff, mypy)

**Chunk 3 — Frontend Infrastructure (Wave 5):**

- [x] Admin middleware guard (server-side `is_admin` check)
- [x] Admin proxy routes (shops, jobs, taxonomy)

**Chunk 4 — Frontend Pages (Wave 6):**

- [x] Admin layout (sidebar nav + breadcrumbs)
- [x] Dashboard page (pipeline overview, job counts, recent submissions)
- [x] Shops list page (search, filter, create)
- [x] Shop detail page (enrichment viewer, tags, photos, pipeline replay actions)
- [x] Jobs page (queue browser, retry, cancel)
- [x] Taxonomy page (coverage stats, tag frequency, low-confidence shops)

**Chunk 5 — Verification (Wave 7):**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

### Admin Import Triggers

> **Design Doc:** [docs/designs/2026-03-02-admin-import-triggers-design.md](docs/designs/2026-03-02-admin-import-triggers-design.md)

**Chunk 1 — Region Config + Pre-Filter Pipeline (Wave 1):**

- [x] Shared region config (`backend/core/regions.py`): GeoBounds, Region, REGIONS dict with Greater Taipei
- [x] Pre-filter module: URL validation, fuzzy dedup (Levenshtein + coords), known-failed check, name validation
- [x] Pre-filter tests (TDD for each filter step)

**Chunk 2 — Importer Updates (Wave 2):**

- [x] Update `google_takeout.py`: accept GeoBounds, run pre-filter, mark `pending_url_check`
- [x] Update `cafe_nomad.py`: accept Region, dynamic Cafe Nomad API URL, run pre-filter
- [x] Update importer tests for new params

**Chunk 3 — Backend Routes + URL Checker (Wave 3):**

- [x] `POST /admin/shops/import/cafe-nomad` with region param
- [x] `POST /admin/shops/import/google-takeout` with multipart file upload
- [x] `POST /admin/shops/bulk-approve` (max 50/batch, staggered priority)
- [x] `POST /admin/shops/import/check-urls` (background URL validation batch)
- [x] Background URL checker worker (5 concurrent, 1s batch delay)
- [x] Route tests with TDD

**Chunk 4 — Frontend (Wave 4):**

- [x] Next.js proxy routes (4 new routes, including custom multipart proxy for Google Takeout)
- [x] Admin shops page: region dropdown, import buttons, Check URLs button
- [x] Admin shops page: bulk approve UI (checkbox selection + approve action)
- [x] Add `pending_url_check` and `pending_review` to status filters

**Chunk 5 — Verification (Wave 5):**

- [x] All backend tests pass (pytest)
- [x] ruff + mypy pass
- [x] Frontend type-check + build pass

### Test Improvement (Phase 0 + 1)

> **Design Doc:** [docs/designs/2026-02-27-test-improvement-design.md](docs/designs/2026-02-27-test-improvement-design.md)
> **Philosophy:** [docs/testing-philosophy.md](docs/testing-philosophy.md)
> **Plan:** [docs/plans/2026-02-27-test-improvement-phase-0-1-plan.md](docs/plans/2026-02-27-test-improvement-phase-0-1-plan.md)

**Phase 0 — Test Infrastructure (Wave 1-2):**

- [x] Backend test factories (make_user, make_shop_row, make_list, make_checkin, make_stamp)
- [x] Frontend test factories (makeUser, makeSession, makeShop, makeList, makeCheckIn, makeStamp)
- [x] Frontend mock helpers (createMockSupabaseAuth, createMockRouter)
- [x] Validate pattern: refactor settings/page.test.tsx to use shared utilities
- [x] Validate pattern: refactor test_search_service.py to use shared factories

**Phase 1 — Auth Test Hardening (Wave 3):**

- [x] Login: successful login redirects to home
- [x] Login: OAuth buttons call signInWithOAuth with correct provider
- [x] Signup: successful signup shows email confirmation
- [x] Signup: error display on failed signup

**Previously blocked page tests (unblocked by Phase 2A):**

- [x] Lists page tests (completed in Phase 2A Completion)
- [x] Profile page tests (completed in Phase 2A Completion)
- Search page tests → moved to Phase 2B (blocked until semantic search UI)

Discovered gaps moved to → Quality Gate: Pre-Phase 2B section below.

**Phase 1 is done when:** Auth works end-to-end including PDPA consent and account deletion. Admin can add and edit shop data. `git clone` → running app in under 15 minutes. (200+ shop data gate moved to Phase 2B.)

---

## Phase 2A: UGC Flows — No Data Required

> Start immediately — no dependency on Phase 1 data gate.
> These flows are self-contained: they need auth + DB schema, but not a populated shop corpus.
> Use the 29 pre-built seed shops for integration testing.

> **UX reference:** All approved mockups in `docs/designs/ux/screenshots/`. Layout intent in `docs/designs/ux/DESIGN_HANDOFF.md`. Personas and friction points in `docs/designs/ux/personas.md` and `journeys.md`. PostHog events in `docs/designs/ux/metrics.md`.

### User Lists

> **Design Doc:** [docs/designs/2026-03-03-user-lists-design.md](docs/designs/2026-03-03-user-lists-design.md)
> **Plan:** [docs/plans/2026-03-03-user-lists-plan.md](docs/plans/2026-03-03-user-lists-plan.md)

**Wave 1 — Foundation:**

- [x] Install frontend deps (swr, vaul, react-map-gl, mapbox-gl)
- [x] Backend: enhance `get_by_user` to include list items

**Wave 2 — Backend endpoints + Frontend primitives:**

- [x] Backend: `GET /lists/pins` endpoint
- [x] Backend: `GET /lists/{list_id}/shops` endpoint
- [x] Backend: `PATCH /lists/{list_id}` rename endpoint
- [x] Frontend types + factories update
- [x] Drawer UI component (vaul wrapper)

**Wave 3 — Frontend core:**

- [x] Frontend API proxy routes (pins, shops, rename)
- [x] `useUserLists` SWR hook with derived state + optimistic mutations

**Wave 4 — UI components:**

- [x] `BookmarkButton` component
- [x] `SaveToListSheet` bottom sheet
- [x] `RenameListDialog` component
- [x] `ListCard` component

**Wave 5 — Pages:**

- [x] `/lists` page (list cards, create, rename, delete)
- [x] `/lists/[listId]` page (split map + shop list + hover highlight)

**Wave 6 — Validation:**

- [x] Full test suite + type-check + lint pass

### Check-in & Stamps

> **Design Doc:** [docs/designs/2026-03-04-checkin-stamps-design.md](docs/designs/2026-03-04-checkin-stamps-design.md)
> **Plan:** [docs/plans/2026-03-04-checkin-stamps-plan.md](docs/plans/2026-03-04-checkin-stamps-plan.md)

**Chunk 1 — Infrastructure (Wave 1):**

- [x] Supabase Storage migration: `checkin-photos` + `menu-photos` buckets with RLS
- [x] Backend `GET /shops/{shop_id}/checkins` endpoint (auth-gated response shape)
- [x] Photo upload utility (`lib/supabase/storage.ts`)

**Chunk 2 — Components (Wave 1-2):**

- [x] PhotoUploader component (camera-first mobile, file picker desktop, max 3)
- [x] StampPassport component (4×5 grid, swipeable pages)
- [x] `useUserStamps` SWR hook

**Chunk 3 — Pages (Wave 2):**

- [x] Check-in page (`/checkin/[shopId]`): upload → submit → stamp toast
- [x] Profile page: stamp passport collection (replace placeholder)
- [x] Next.js proxy route for shop check-ins

**Chunk 4 — Shop Detail Integration (Wave 3):**

- [x] CheckInPhotoGrid component (auth-gated: photo grid vs. preview + login CTA)

### Reviews

> **Design Doc:** [docs/designs/2026-03-04-reviews-design.md](docs/designs/2026-03-04-reviews-design.md)
> **Plan:** [docs/plans/2026-03-04-reviews-plan.md](docs/plans/2026-03-04-reviews-plan.md)

**Chunk 1 — DB + Backend Models (Wave 1-2):**

- [x] DB migration: add review columns to check_ins (stars, review_text, confirmed_tags, reviewed_at)
- [x] Backend models: add review fields to CheckIn, ShopCheckInSummary; add ShopReview, ShopReviewsResponse

**Chunk 2 — Backend Service + API (Wave 3-4):**

- [x] CheckInService: create with review, update_review, validation with TDD
- [x] Checkins API: review fields in POST, PATCH /checkins/{id}/review with TDD
- [x] Shops API: GET /shops/{shop_id}/reviews endpoint with TDD
- [x] Backend verification (pytest, ruff, mypy)

**Chunk 3 — Frontend Components (Wave 3-4):**

- [x] StarRating component (interactive + display modes) with TDD
- [x] TagConfirmation component (taxonomy tag chips) with TDD
- [x] ReviewForm component (stars + tags + text) with TDD

**Chunk 4 — Frontend Integration (Wave 4-5):**

- [x] Check-in page: add optional review fields with TDD
- [x] ReviewCard + ReviewsSection for shop detail with TDD
- [x] Proxy routes (shop reviews, checkin review update)
- [x] Update CheckInSummary types

**Chunk 5 — Verification (Wave 6):**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

### User Profile

> **Design Doc:** [docs/designs/2026-03-04-user-profile-design.md](docs/designs/2026-03-04-user-profile-design.md)
> **Plan:** [docs/plans/2026-03-04-user-profile-plan.md](docs/plans/2026-03-04-user-profile-plan.md)

**Chunk 1 — Foundation (Wave 1-2):**

- [x] Install shadcn Tabs/Avatar + create avatars storage bucket
- [x] Backend Pydantic models (ProfileResponse, StampWithShop, CheckInWithShop, ListSummary)
- [x] ProfileService with TDD (get_profile + update_profile)
- [x] Extend GET /stamps with shop_name JOIN
- [x] Extend GET /checkins with shop data JOIN
- [x] Add GET /lists/summaries endpoint

**Chunk 2 — API + Data Layer (Wave 3-4):**

- [x] Profile API router (GET/PATCH /profile) with TDD
- [x] Frontend proxy routes + SWR hooks (useUserProfile, useUserCheckins, useListSummaries)
- [x] Update StampData type + factory with shop_name (moved to Phase 2A Completion)

**Chunk 3 — UI Components (Wave 5):**

- [x] ProfileHeader component with TDD
- [x] StampDetailSheet + enhance StampPassport tap-to-open
- [x] CheckinHistoryTab component with TDD
- [x] ListsTab component with TDD

**Chunk 4 — Pages + Verification (Wave 6-7):**

- [x] Rebuild profile page (header + passport hero + tabbed check-ins/lists)
- [x] Add profile editing to settings (display name + avatar upload)
- [x] Full integration verification (all tests, type-check, lint)

### Phase 2A Completion

> **Design Doc:** [docs/designs/2026-03-05-phase2a-completion-design.md](docs/designs/2026-03-05-phase2a-completion-design.md)
> **Plan:** [docs/plans/2026-03-05-phase2a-completion-plan.md](docs/plans/2026-03-05-phase2a-completion-plan.md)

**Chunk 1 — Type Fix + Analytics Hook (Wave 1):**

- [x] Fix Stamp type: add shopName field
- [x] Create useAnalytics hook with TDD

**Chunk 2 — Backend Changes (Wave 1-2):**

- [x] Backend: is_first_checkin_at_shop in check-in response with TDD
- [x] DB migration: session tracking columns
- [x] Backend: session heartbeat endpoint with TDD

**Chunk 3 — Frontend Analytics Events (Wave 3):**

- [x] `checkin_completed` PostHog event: shop_id, is_first_checkin_at_shop, has_text_note, has_menu_photo
- [x] `profile_stamps_viewed` PostHog event: stamp_count
- [x] SessionTracker component + `session_start` event: days_since_first_session, previous_sessions

**Chunk 4 — User Journey Tests (Wave 1, 3):**

- [x] Lists page tests (create, cap enforcement, delete)
- [x] Profile page tests (stamp detail, empty states, check-in history)

**Chunk 5 — Verification:**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

**Phase 2A is done when:** A user can sign up, check in with a photo at a seed shop, earn a stamp, create a list, leave a review, and view their profile — all without a full shop corpus. PostHog confirms `checkin_completed`, `profile_stamps_viewed`, and `session_start` fire correctly.

---

## Developer Tooling

### Preflight Doctor (`make doctor`)

> **Design Doc:** [docs/designs/2026-03-12-preflight-doctor-design.md](docs/designs/2026-03-12-preflight-doctor-design.md)
> **Plan:** [docs/plans/2026-03-12-preflight-doctor-plan.md](docs/plans/2026-03-12-preflight-doctor-plan.md)

**Chunk 1 — Script + Makefile:**

- [x] Create `scripts/doctor.sh` (12 diagnostic checks)
- [x] Add `make doctor` Makefile target

**Chunk 2 — Documentation:**

- [x] Update CLAUDE.md with preflight rules
- [x] Update ERROR-PREVENTION.md with debugging loops entry

**Chunk 3 — Verification:**

- [x] Manual acceptance criteria verification (all 4 scenarios)

---

## Quality Gate: Pre-Phase 2B

> **Design Doc:** [docs/designs/2026-03-05-pre-phase2b-quality-gate-design.md](docs/designs/2026-03-05-pre-phase2b-quality-gate-design.md)
> **Plan:** [docs/plans/2026-03-05-pre-phase2b-quality-gate-plan.md](docs/plans/2026-03-05-pre-phase2b-quality-gate-plan.md)
> **Source:** Progress review findings (`docs/progress-reviews/pre-phase-2b-2026-03-05.md`)
>
> Address all gaps from the progress review that don't depend on Phase 2B data.

### DB Migration — Missing Indexes

- [x] DB migration: `idx_shop_reviews_shop ON shop_reviews(shop_id)` — prevents full-table scan on shop detail
- [x] DB migration: `idx_shops_processing_status ON shops(processing_status)` — speeds pipeline state queries
- [x] DB migration: `idx_profiles_deletion_requested ON profiles(deletion_requested_at) WHERE NOT NULL` — speeds hard-delete scheduler
- [x] DB migration: `idx_shops_source ON shops(source)` — speeds analytics/admin filtering

### Frontend Tests — Auth Pages

- [x] Login page tests: email form submit, OAuth buttons (Google/LINE), error display, redirect
- [x] Signup page tests: signup form, PDPA checkbox required, email confirmation, error display
- [x] PDPA consent page tests: consent checkbox + submit, redirect to home, consent API call
- [x] Account recovery page tests: cancel-deletion API call, success message, error state

### Frontend Tests — SWR Hooks

- [x] `useUserProfile` hook tests: fetch profile, null while loading, error state, mutate
- [x] `useUserCheckins` hook tests: fetch check-ins, empty array while loading, error
- [x] `useListSummaries` hook tests: fetch summaries, empty array while loading, error

### Backend Test + Validation

- [x] Dedicated test for `check_urls.py` handler: valid URL, dead URL, batch processing, status updates
- [x] Validate `confirmed_tags` against taxonomy in CheckInService (reject unknown tag IDs with 400)

### Verification

- [x] All new test files pass (7 frontend + 1 backend)
- [x] DB migration applies cleanly
- [x] Full verification (pnpm test, pytest, pnpm build, ruff, mypy)

**Quality gate is done when:** All 8 new test files pass, DB indexes applied, confirmed_tags validated at service level. No regressions. ✅ **Complete — verified 2026-03-13.**

---

## Phase 2B: Discovery & Search Flows — Requires 200+ Live Shops

> Blocked on pipeline data gate: `SELECT COUNT(*) FROM shops WHERE processing_status = 'live'` ≥ 200.
> Can be designed and partially scaffolded in parallel, but cannot be fully built or tested without real data.

> **UX reference:** Same as Phase 2A above.

### Pipeline: Data Seeding & Enrichment

This is the gate for Phase 2B. Shops must be imported, enriched, embedded, and published before discovery flows can be built.

**Chunk 1 — Local environment:**

- [x] Run `supabase start` and confirm Studio accessible at http://localhost:54323
- [x] Run `supabase db push` and confirm all migrations applied (check for errors in output)
- [x] Confirm `supabase/migrations/20260302000003_tagged_shop_count_rpc.sql` is the latest — `supabase db diff` should show no pending changes
- [x] Set required env vars in `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `APIFY_API_TOKEN`

**Chunk 2 — Full pipeline: import via CSV/URL scripts + reach 164 live shops:**

> ~~Google Takeout GeoJSON importer~~ — pivoted to CSV + URL importers (see `scripts/run_csv_import.py` and `scripts/run_url_import.py`). The Google Takeout workflow is no longer planned.

- [x] Prepare shop CSV or collect Google Maps URLs
- [x] Run import: `cd backend && uv run python scripts/run_csv_import.py /path/to/shops.csv` or `uv run python scripts/run_url_import.py "URL1" "URL2"`
- [x] Start backend: `cd backend && uvicorn main:app --reload --port 8000`
- [x] Confirm shops queued — check `GET /admin/pipeline/overview`
- [x] Confirm SCRAPE jobs queued — check `GET /admin/pipeline/jobs?status=pending`
- [x] Let worker run (APScheduler fires every 30s) — monitor progress in admin dashboard
- [x] Pipeline chain completes: SCRAPE_SHOP → ENRICH_SHOP → EMBED_SHOP → PUBLISH_SHOP
- [x] Verify: `SELECT COUNT(*) FROM shops WHERE processing_status = 'live'` = 164 (accepted as sufficient for beta)
- [x] Verify: dead-letter queue empty or investigated (`GET /admin/pipeline/dead-letter`)
- [x] Spot-check search quality: run 5 queries from `scripts/prebuild/data-pipeline/pass5-search-test.ts` against the live API

**Chunk 3 — Enrichment validation:**

- [x] Spot-check enrichment quality: taxonomy tags, descriptions, mode inference on 10 random shops
- [x] Menu photo enrichment worker: validate with real check-in data (handler exists at `backend/workers/handlers/enrich_menu_photo.py`)
- [x] Incremental tag classification: re-classify only delta tags when taxonomy grows
- [x] Embedding regeneration trigger: re-embed only when enrichment actually changes

### Discovery UI Scaffolding

> **Design Doc:** [docs/designs/2026-03-13-phase2b-discovery-search-ui-design.md](docs/designs/2026-03-13-phase2b-discovery-search-ui-design.md)
> **Plan:** [docs/plans/2026-03-13-phase2b-discovery-search-ui-plan.md](docs/plans/2026-03-13-phase2b-discovery-search-ui-plan.md)

**Chunk 1 — Backend Foundation (Wave 1-2):**

- [x] DB migration: add `slug` column to shops table
- [x] Backend slugify utility with pinyin support (TDD)
- [x] Enhance GET /shops/{id} with photos, tags, slug, mode_scores (TDD)
- [x] Add `featured` query param to GET /shops (TDD)
- [x] Slug backfill script

**Chunk 2 — Frontend Infrastructure (Wave 1-3):**

- [x] useMediaQuery / useIsDesktop hook (TDD)
- [x] useSearchState hook — URL param driven (TDD)
- [x] useShopDetail hook (TDD)
- [x] useShops hook (TDD)
- [x] useSearch hook — auth-gated semantic search (TDD)
- [x] Frontend types: ShopDetail, slug field

**Chunk 3 — Shared Components (Wave 2-3):**

- [x] SearchBar — AI search input with sparkle icon (TDD)
- [x] SuggestionChips — pre-fill chips (TDD)
- [x] ModeChips — semantic mode toggles (TDD)
- [x] FilterPills — quick filter row (TDD)
- [x] FilterSheet — vaul Drawer filter panel (TDD)
- [x] ShopCard — photo + name + rating card (TDD)
- [x] ShareButton — Web Share API + clipboard (TDD)

**Chunk 4 — Navigation (Wave 2-5):**

- [x] BottomNav — mobile tab bar (TDD)
- [x] HeaderNav — desktop top nav (TDD)
- [x] AppShell layout integration
- [x] Add /map to middleware public routes

**Chunk 5 — Pages (Wave 6):**

- [x] Home page — SSR featured shops + client search (TDD)
- [x] Shop Detail page — SSR with og:\* meta tags (TDD)
- [x] Map page — lazy-loaded Mapbox + pins (TDD)
- [x] Search results page — auth-gated ranked results (TDD)

**Chunk 6 — Analytics (Wave 7):**

- [x] `search_submitted` PostHog event
- [x] `shop_detail_viewed` PostHog event
- [x] `shop_url_copied` PostHog event
- [x] `filter_applied` PostHog event (wired in FilterPills + FilterSheet)

### Phase 2B Completion (all deferred work)

> **Design Doc:** [docs/designs/2026-03-14-phase2b-completion-design.md](docs/designs/2026-03-14-phase2b-completion-design.md)
> **Plan:** [docs/plans/2026-03-14-phase2b-completion-plan.md](docs/plans/2026-03-14-phase2b-completion-plan.md)

**Chunk 1 — Backend camelCase (Wave 1-2):**

- [x] CamelModel base class with Pydantic alias_generator (TDD)
- [x] All API endpoints serialize as camelCase (TDD)

**Chunk 2 — Structured taxonomy_tags (Wave 3):**

- [x] GET /shops/{id} returns TaxonomyTag objects with dimension + labelZh (TDD)

**Chunk 3 — Frontend type cleanup (Wave 4):**

- [x] Remove dual-casing workarounds in AttributeChips, ShopDetailClient

**Chunk 4 — New components (Wave 5):**

- [x] MapDesktopCard (TDD)
- [x] ShopDescription (TDD)
- [x] MenuHighlights (TDD)
- [x] RecentCheckinsStrip (TDD)
- [x] ShopMapThumbnail (TDD)
- [x] Viewport-only pin filtering in MapView (TDD)
- [x] useGeolocation hook (TDD)

**Chunk 5 — Integration (Wave 6):**

- [x] Integrate sub-components into ShopDetailClient
- [x] Integrate MapDesktopCard + real data into map page
- [x] 我附近 geolocation chip wiring

**Chunk 6 — Analytics (Wave 5-6):**

- [x] filter_applied — verify already wired
- [x] search_submitted — add result_count, mode_chip_active
- [x] shop_detail_viewed — add referrer, session_search_query

**Chunk 7 — Test quality (Wave 7):**

- [x] Rewrite page tests to mock at HTTP boundary
- [x] Rewrite test names to describe user outcomes

**Chunk 8 — Verification (Wave 8):**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

### Performance (verified during implementation)

- [x] Mobile-first UI: design and test at 390px width first
- [x] Desktop breakpoint: ≥1024px — two distinct layout systems
- [x] Map performance: lazy-load Mapbox, viewport-only pins, static Mapbox image for Shop Detail
- [x] Core Web Vitals: LCP < 2.5s, CLS < 0.1 (Sentry CWV tracing active, image sizes + CJK font optimized)
- [x] `backdrop-filter: blur()` fallback for glassmorphism on Android

### Performance Audit & Fixes

> **Design Doc:** [docs/designs/2026-03-14-phase2b-performance-design.md](docs/designs/2026-03-14-phase2b-performance-design.md)
> **Plan:** [docs/plans/2026-03-14-phase2b-performance-plan.md](docs/plans/2026-03-14-phase2b-performance-plan.md)

**Chunk 1 — Image + Font + CWV (Wave 1-2):**

- [x] Verify Sentry CWV already active (tracesSampleRate: 0.1)
- [x] Add `sizes` to ShopHero, CheckInPhotoGrid, StampPassport images
- [x] Convert ProfileHeader avatar to next/image with sizes
- [x] Add Noto Sans TC font via next/font/google

**Chunk 2 — Map List-View Toggle (Wave 1-4):**

- [x] MapListView component with distance sorting (TDD)
- [x] Map page toggle button (TDD)

**Chunk 3 — Verification (Wave 5):**

- [x] Full verification (vitest, type-check, lint, build)

**Phase 2B is done when:** A non-team beta user can sign up, complete the PDPA consent flow, search semantically, find a coffee shop, check in with a photo, earn a stamp, leave a review, and view their profile — all without assistance. PostHog Live Events confirms all 7 instrumented events fire correctly.

---

## PWA: Installable App

> Make CafeRoam installable on mobile home screens (Add to Home Screen).
> Tier 1 only — installability + meta tags. No service worker / offline (Tier 2 post-launch).

> **Design Doc:** [docs/designs/2026-03-16-pwa-installable-app-design.md](docs/designs/2026-03-16-pwa-installable-app-design.md)
> **Plan:** [docs/plans/2026-03-16-pwa-installable-app-plan.md](docs/plans/2026-03-16-pwa-installable-app-plan.md)

**Chunk 1 — Icons + Manifest:**

- [x] Install `@napi-rs/canvas` devDependency
- [x] Generate placeholder PWA icons (啡 on coffee brown #6F4E37) via `scripts/generate-pwa-icons.ts` (canvas-based, one-shot)
- [x] Create `app/manifest.ts` (Next.js native manifest export)

**Chunk 2 — Layout Metadata:**

- [x] Add `viewport` export to `app/layout.tsx` (theme-color `#6F4E37`, width, scale)
- [x] Add `icons` + `appleWebApp` to metadata export in `app/layout.tsx`

**Chunk 3 — Verification:**

- [x] `pnpm build` passes with no type errors
- [ ] DevTools > Application > Manifest shows valid manifest with 3 icons
- [ ] Lighthouse PWA audit: "installable" passes
- [ ] iOS Safari: Add to Home Screen shows correct icon + '啡遊' title
- [ ] Android Chrome: install prompt / "Add to Home Screen" works

---

## E2E Testing Infrastructure

> Playwright-based browser e2e testing with two CI workflows.

> **Design Doc:** [docs/designs/2026-03-16-e2e-testing-infrastructure-design.md](docs/designs/2026-03-16-e2e-testing-infrastructure-design.md)
> **Plan:** [docs/plans/2026-03-16-e2e-testing-infrastructure-plan.md](docs/plans/2026-03-16-e2e-testing-infrastructure-plan.md)

**Chunk 1 — Infrastructure (Wave 1):**

- [x] Install Playwright + config (`playwright.config.ts`)
- [x] Geolocation fixture (Taipei/Tokyo coords)
- [x] Auth fixture (Supabase login + session reuse)

**Chunk 2 — Critical Path Specs (Wave 2):**

- [x] Discovery specs: Near Me grant/deny + text search (J01-J03)
- [x] Auth specs: auth wall + signup PDPA (J05-J06)
- [x] Search spec: semantic search (J07)
- [x] Check-in specs: photo upload + validation (J10-J11)
- [x] Lists specs: CRUD + 3-list cap (J12-J13)

**Chunk 3 — Stubs + CI + Docs (Wave 3):**

- [x] Phase 2 stub specs: profile, feed, PWA, edge cases (J04-J30)
- [x] CI workflows: `e2e-critical.yml` (PR-blocking) + `e2e-nightly.yml` (cron)
- [x] Update `docs/e2e-journeys.md` with full journey matrix

**Chunk 4 — Verification (Wave 4):**

- [x] Full e2e suite runs: 10 critical PASS + 13 stubs PENDING
- [x] Lint + type-check pass

---

## Phase 3: Explore Feature + UI Reconstruct

Adds the Explore tab and redesigns the four main sections of the app using Pencil. All non-UI work is backend + basic functional frontend only — polish happens in the UI Reconstruct sections at the end.

> **Design Doc:** [docs/designs/2026-03-16-explore-feature-design.md](docs/designs/2026-03-16-explore-feature-design.md)

### Navigation Restructure

> **Design Doc:** [docs/designs/2026-03-16-navigation-restructure-design.md](docs/designs/2026-03-16-navigation-restructure-design.md)
> **Plan:** [docs/plans/2026-03-16-navigation-restructure-plan.md](docs/plans/2026-03-16-navigation-restructure-plan.md)

**Chunk 1 — Bottom Nav:**

- [x] Update `bottom-nav.tsx` tabs to 地圖 / 探索 / 收藏 / 我的

**Chunk 2 — Route Replacement:**

- [x] Replace `app/page.tsx` with map-only Find page
- [x] Delete `app/map/page.tsx` and `app/map/page.test.tsx`

**Chunk 3 — Redirect + Scaffold:**

- [x] Add `/map` → `/` permanent redirect in `next.config.ts`
- [x] Create `app/explore/page.tsx` scaffold

### Tarot — Surprise Me (Explore Layer 1)

> **Design Doc:** [docs/designs/2026-03-17-tarot-implementation-design.md](docs/designs/2026-03-17-tarot-implementation-design.md)
> **Plan:** [docs/plans/2026-03-17-tarot-surprise-me-plan.md](docs/plans/2026-03-17-tarot-surprise-me-plan.md)

**Chunk 1 — Foundation (Wave 1):**

- [x] DB migration: tarot_title + flavor_text columns
- [x] is_open_now utility with TDD
- [x] TarotCard Pydantic model + vocabulary constant + factory
- [x] Frontend types + Bricolage Grotesque font + recently-seen utility

**Chunk 2 — Backend Service (Wave 2-4):**

- [x] TarotService with geo filter + open-now + title uniqueness
- [x] GET /explore/tarot-draw API endpoint
- [x] Next.js proxy route
- [x] Enrichment update: assign_tarot tool + enrich_shop integration

**Chunk 3 — Frontend Components (Wave 2, 5-6):**

- [x] TarotCard face-down component
- [x] TarotRevealDrawer + TarotEmptyState
- [x] TarotSpread + Explore page assembly
- [x] Share card generation (html2canvas)

**Chunk 4 — Hook + Integration:**

- [x] useTarotDraw SWR hook

### Vibe Tags — Browse by Mood (Explore Layer 2)

> **Design Doc:** [docs/designs/2026-03-17-vibe-tags-design.md](docs/designs/2026-03-17-vibe-tags-design.md)
> **Plan:** [docs/plans/2026-03-17-vibe-tags-plan.md](docs/plans/2026-03-17-vibe-tags-plan.md)

**Chunk 1 — DB + Models (Wave 1):**

- [x] Design: Finalize 10 vibe collections (editorial name → existing taxonomy tag combo)
- [x] DB migration: `vibe_collections` table + 10 seed vibes
- [x] Backend Pydantic models: `VibeCollection`, `VibeShopResult`, `VibeShopsResponse`
- [x] Frontend TypeScript types: `types/vibes.ts`

**Chunk 2 — Backend Service + API (Wave 2-3):**

- [x] `VibeService` with overlap scoring + geo filtering (TDD)
- [x] `GET /explore/vibes` endpoint with TDD
- [x] `GET /explore/vibes/{slug}/shops` endpoint with TDD

**Chunk 3 — Frontend (Wave 2-4):**

- [x] API client (`lib/api/vibes.ts`) + Next.js proxy routes
- [x] `useVibes` SWR hook with TDD
- [x] `useVibeShops` SWR hook with TDD
- [x] Explore page: wire vibe strip section with TDD
- [x] `/explore/vibes/[slug]` results page with TDD

**Chunk 4 — Verification (Wave 5):**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

### Community Notes — Partner Reviews (Explore Layer 3)

> **Design Doc:** [docs/designs/2026-03-18-community-notes-design.md](docs/designs/2026-03-18-community-notes-design.md)
> **Plan:** [docs/plans/2026-03-18-community-notes-plan.md](docs/plans/2026-03-18-community-notes-plan.md)
> **ADR:** [docs/decisions/2026-03-18-user-roles-join-table.md](docs/decisions/2026-03-18-user-roles-join-table.md)

_Highlighted check-in reviews from partner/blogger users. Reuses existing check-in data — no separate content type. Seed with beta blogger invites during Phase 4._

- [x] DB migration: `user_roles` table (user_id, role, granted_at, granted_by) — multi-role join table
- [x] DB migration: `community_note_likes` table (checkin_id, user_id) with RLS
- [x] Backend: `UserRole`, `CommunityNoteCard`, `CommunityFeedResponse` Pydantic models
- [x] Backend: `CommunityService` (preview, feed, toggle_like) with TDD
- [x] Backend: `GET /explore/community/preview` + `GET /explore/community` endpoints with TDD
- [x] Backend: `POST /explore/community/{checkin_id}/like` endpoint (auth-gated) with TDD
- [x] Backend: Admin roles API (`POST /admin/roles`, `DELETE /admin/roles/{user_id}/{role}`, `GET /admin/roles`)
- [x] Frontend: `CommunityCard` + `CommunityCardFull` + `LikeButton` components with TDD
- [x] Frontend: `useCommunityPreview`, `useCommunityFeed`, `useLikeStatus` SWR hooks with TDD
- [x] Frontend: Explore page "From the Community" section (Layer 3) with TDD
- [x] Frontend: `/explore/community` feed page with TDD
- [x] Frontend: Proxy routes (preview, feed, like)
- [x] Analytics: `community_note_viewed`, `community_note_liked`, `community_feed_opened`

### UI Reconstruct — Find

> **Design Doc:** [docs/designs/2026-03-18-find-ui-reconstruct-design.md](docs/designs/2026-03-18-find-ui-reconstruct-design.md)
> **Plan:** [docs/plans/2026-03-18-find-ui-reconstruct-plan.md](docs/plans/2026-03-18-find-ui-reconstruct-plan.md)

_Designed in Pencil. Replaces current 首頁 + 地圖 split into a unified Find experience._

- [x] Pencil: Design Find page (map/list toggle, search bar, filter chips) — frame `c62Ni`
- [x] Pencil: Design shop card (list view) and map pin/popup (map view) — frame `MygeB`
- [x] Pencil: Design Shop View (hero image, AI summary, tags, hours, reviews, claim page) — frame `3hOsp`
- [x] Pencil: Design filter panel bottom sheet (5 category tabs, 105 taxonomy tags, search) — frame `vEqbC`
- [x] Pencil: Design Shop View / Directions sheet (walk, drive, nearest MRT) — frame `ENKsc`

**Chunk 1 — Foundations (Wave 1, parallel):**

- [x] Add `view` param to `useSearchState` hook (Task 1)
- [x] Create MRT stations JSON + `nearestMrtStation` utility (Task 2)
- [x] Rewrite `FilterSheet` — 5 tabs + tag search (Task 3)
- [x] Update `MapView` — branded coffee cup pins (Task 4)
- [x] Create `MapListView` component — vertical list (Task 5)

**Chunk 2 — Integration (Wave 2–3):**

- [x] Create `DirectionsSheet` component (Task 6)
- [x] Refactor `app/page.tsx` — view toggle + wire all components (Task 7)
- [x] Wire `DirectionsSheet` into Shop View (Task 8)

**Chunk 3 — Verification:**

- [x] `pnpm test` + `pnpm type-check` + `pnpm build` all pass (Task 9)

### Map View UI Rebuild (from Pencil designs)

> **Design Doc:** [docs/designs/2026-03-19-map-view-rebuild-design.md](docs/designs/2026-03-19-map-view-rebuild-design.md)
> **Plan:** [docs/plans/2026-03-19-map-view-ui-rebuild-plan.md](docs/plans/2026-03-19-map-view-ui-rebuild-plan.md)

**Chunk 1 — Foundation (Wave 1):**

- [x] Task 1: Typography & CSS (DM Sans + design tokens)

**Chunk 2 — Reusable Components (Wave 2, parallel):**

- [x] Task 2: FilterTag (active/inactive pill)
- [x] Task 3: ViewToggle (map/list segmented toggle)
- [x] Task 5: SearchBar rebuild (filter button + design styling)
- [x] Task 6: ShopCardCarousel (mobile map bottom card)
- [x] Task 7: ShopCardCompact (list row + desktop panel with selected state)
- [x] Task 8: ShopCardGrid (desktop 3-column photo card)
- [x] Task 9: MapPin SVG (default/active states)
- [x] Task 10: CollapseToggle (desktop panel strip)
- [x] Task 11: BottomNav rebuild (pill-shaped tab bar)
- [x] Task 12: HeaderNav rebuild (logo + pill nav + avatar)

**Chunk 3 — Compound Components (Wave 3, parallel):**

- [x] Task 4: CountHeader (count + ViewToggle + sort)
- [x] Task 13: FilterSheet rebuild (vaul drawer + dialog modal)
- [x] Task 14: ShopCarousel (horizontal scroll container)

**Chunk 4 — Layout + Integration (Wave 4-5):**

- [x] Task 15: Layout components + page.tsx integration
- [x] Task 16: Delete old components + rename nav files

### Shop View — Directions

> **Design Doc:** [docs/designs/2026-03-20-directions-provider-and-community-cleanup-design.md](docs/designs/2026-03-20-directions-provider-and-community-cleanup-design.md)
> **Plan:** [docs/plans/2026-03-20-directions-provider-and-community-cleanup-plan.md](docs/plans/2026-03-20-directions-provider-and-community-cleanup-plan.md)

**Chunk 1 — Backend Provider (Wave 1-3):**

- [x] DirectionsResult Pydantic model
- [x] MapsProvider protocol + MapboxMapsAdapter get_directions (TDD)
- [x] GET /maps/directions API endpoint (TDD)

**Chunk 2 — Frontend Integration (Wave 4-6):**

- [x] Next.js proxy route for maps/directions
- [x] Refactor DirectionsSheet to use backend proxy
- [x] Wire useGeolocation into Shop Detail page

**Chunk 3 — Verification (Wave 7):**

- [x] Full verification (pytest, vitest, ruff, mypy, pnpm build)

### UI Reconstruct — Shop View

> **Design Doc:** [docs/designs/2026-03-20-shop-view-ui-reconstruct-design.md](docs/designs/2026-03-20-shop-view-ui-reconstruct-design.md)
> **Plan:** [docs/plans/2026-03-20-shop-view-ui-reconstruct-plan.md](docs/plans/2026-03-20-shop-view-ui-reconstruct-plan.md)

**Chunk 1 — Prereqs + Isolated new components (Wave 1a, parallel):**

- [x] Install shadcn Popover (`pnpm dlx shadcn@latest add popover`)
- [x] Task 1: `ClaimBanner` component (footer strip)
- [x] Task 2: `CheckInSheet` (Vaul drawer — frames `6Wn4A`)
- [x] Task 3: `CheckInPopover` (desktop 320px — frame `I2r82`)
- [x] Task 4: `SavePopover` (desktop 320px — frame `C0sGo`)
- [x] Task 5: `SharePopover` (desktop 320px — frame `iQfwr`)

**Chunk 2 — In-place restyling (Wave 1b, parallel):**

- [x] Task 6: `ShopHero` — floating back/bookmark/share overlay (frame `3hOsp`)
- [x] Task 7: `ShopIdentity` — open-status badge, distance pill, address (frame `3hOsp`)
- [x] Task 8: `SaveToListSheet` — 3 visual states (frames `y52Ff`, `udpQf`, `rgu49`)
- [x] Task 9: `ShopDescription` + `AttributeChips` — section headers + restyle
- [x] Task 10: `ShopReviews` — "See all" link
- [x] Task 11: `DirectionsSheet` — visual polish (frame `ENKsc`)

**Chunk 3 — Wiring (Wave 2–3):**

- [x] Task 12: `ShopActionsRow` — Check In + Save + Share (mobile sheets / desktop popovers)
- [x] Task 13: `ShopDetailClient` integration + SPEC §9 update

**Chunk 4 — Cleanup + Verification (Wave 4):**

- [x] Task 14: Delete `StickyCheckinBar` + `BookmarkButton`, full test + build verification

---

### UI Reconstruct — Explore

> **Design Doc:** [docs/designs/2026-03-21-explore-ui-reconstruct-design.md](docs/designs/2026-03-21-explore-ui-reconstruct-design.md)
> **Plan:** [docs/plans/2026-03-21-explore-ui-reconstruct-plan.md](docs/plans/2026-03-21-explore-ui-reconstruct-plan.md)
> **Original Design:** [docs/designs/2026-03-17-explore-tarot-redesign.md](docs/designs/2026-03-17-explore-tarot-redesign.md)

_Pencil designs approved: 5 mobile + 4 desktop frames._

- [x] Pencil: Design Explore page — 3-card spread state — frame `UOZmR`
- [x] Pencil: Design Explore / Tarot Revealed — full-screen modal — frame `RaBMi`
- [x] Pencil: Design Explore / Cards Returned — frame `eEd4y`
- [x] Pencil: Design vibe results page — frame `IbXPH`
- [x] Pencil: Design community feed page — frame `G7Qb0`
- [x] Pencil: Design desktop variants — frames `MedPD`, `E4DGS`, `NMuwP`, `YgUn0`

**Chunk 1 — Infrastructure:**

- [x] Install shadcn Dialog component

**Chunk 2 — Page Restyling (parallel):**

- [x] Explore main page — 探索 header, daily draw label, vibe See all, desktop two-column
- [x] Vibe Results page — circle back, subtitle chips, shop count badge, star ratings, desktop 3-col grid
- [x] Community page — desktop 2-col grid, 啡遊筆記 title

**Chunk 3 — Component Restyling:**

- [x] TarotRevealDrawer — dark espresso theme, gold accents, desktop Dialog modal

**Chunk 4 — Verification:**

- [x] Full verification (vitest, type-check, lint, build)

### UI Reconstruct — Favorites

> **Design Doc:** [docs/designs/2026-03-23-favorites-ui-reconstruct-design.md](docs/designs/2026-03-23-favorites-ui-reconstruct-design.md)
> **Plan:** [docs/plans/2026-03-23-favorites-ui-reconstruct-plan.md](docs/plans/2026-03-23-favorites-ui-reconstruct-plan.md)

_Designed in Pencil. Current lists UI gets a visual pass._

- [x] Pencil: Design Favorites page (list cards, mini map, 2/3 cap indicator, empty slot) — frame P7hXw
- [x] Pencil: Design list detail page — "Favorites / List on Map" frames `zG9ZS` (mobile) + `Ik2pj` (desktop)

**Chunk 1 — Leaf Components (Wave 1, parallel):**

- [x] FavoritesShopRow component (thumbnail + info + distance) with TDD
- [x] FavoritesListCard component (photos, options menu, "View on map") with TDD
- [x] EmptySlotCard component (dashed placeholder) with TDD
- [x] useListPins + useListShops SWR hooks with TDD
- [x] FavoritesMiniMap component (interactive Mapbox, 160px) with TDD

**Chunk 2 — Layout Components (Wave 2, parallel):**

- [x] FavoritesMobileLayout (header + mini-map + cards + bottom nav) with TDD
- [x] FavoritesDesktopLayout (420px sidebar + map) with TDD
- [x] ListDetailMobileLayout (map + fixed bottom sheet) with TDD
- [x] ListDetailDesktopLayout (collapsible panel + map) with TDD

**Chunk 3 — Page Rewrites (Wave 3):**

- [x] Rewrite `/lists` overview page with new layouts
- [x] Rewrite `/lists/[listId]` detail page with map + layouts

**Chunk 4 — Cleanup + Verification (Wave 4):**

- [x] Delete old ListCard component + cleanup dead imports
- [x] Full verification (vitest, type-check, lint, build)

### UI Reconstruct — Profile

_Designed in Pencil. Stamps, check-in history, account settings._

- [x] Pencil: Design Profile page (brown header, stamp passport, check-in history tab) — frame HhuNs
- [x] Pencil: Design stamp passport grid (4×3, filled + locked states) — included in Profile frame
- [ ] Frontend: Implement Profile UI from Pencil designs

> **Plan:** [docs/plans/2026-03-23-profile-ui-reconstruct-plan.md](docs/plans/2026-03-23-profile-ui-reconstruct-plan.md)
> **Design:** [docs/designs/2026-03-23-profile-ui-reconstruct-design.md](docs/designs/2026-03-23-profile-ui-reconstruct-design.md)

- [x] Task 1: Backend — add `shop_photo_url` to CheckInWithShop
- [x] Task 2: Frontend — update CheckInData type and factory
- [x] Task 3: Frontend — rebuild ProfileHeader
- [x] Task 4: Frontend — rebuild PolaroidSection
- [x] Task 5: Frontend — rebuild CheckinHistoryTab
- [x] Task 6: Frontend — update Profile page layout and wiring

### Profile Polaroid Redesign

> **Design Doc:** [docs/designs/2026-03-19-profile-polaroid-redesign.md](docs/designs/2026-03-19-profile-polaroid-redesign.md)
> **Plan:** [docs/plans/2026-03-19-profile-polaroid-redesign-plan.md](docs/plans/2026-03-19-profile-polaroid-redesign-plan.md)

**Chunk 1 — Backend + Types (Wave 1):**

- [x] Task 1: Backend — Extend stamps API with photo_url, district, diary_note
- [x] Task 2: Frontend — Update StampData type and factory
- [x] Task 4: Frontend — Remove stamp count from ProfileHeader

**Chunk 2 — New Components (Wave 2-3):**

- [x] Task 3: Frontend — PolaroidCard component
- [x] Task 9: Frontend — Update StampDetailSheet with diary note and tilt

- [x] Task 5: Frontend — PolaroidSection (profile preview)
- [x] Task 6: Frontend — CorkBoard (scattered + grid toggle)

**Chunk 3 — Pages + Integration (Wave 4):**

- [x] Task 7: Frontend — `/profile/memories` cork board page
- [x] Task 8: Frontend — Update profile page (swap StampPassport → PolaroidSection, remove Lists tab)

**Phase 3 is done when:** All four pages have Pencil designs approved and implemented. Explore tab is live with Tarot + Vibe Tags functional. At least 3 beta bloggers onboarded.

---

## Phase 4: Beta & Launch — Target: Week 3-4

30-50 person beta → public Threads launch.

### Analytics Review

- [ ] Review to make sure we have cover all analytics events needed

### Menu Items & Search Enrichment (DEV-6)

> **Design Doc:** [docs/designs/2026-03-24-menu-items-embedding-design.md](docs/designs/2026-03-24-menu-items-embedding-design.md)
> **Plan:** [docs/plans/2026-03-24-menu-items-embedding-plan.md](docs/plans/2026-03-24-menu-items-embedding-plan.md)

**Chunk 1 — DB Foundation (Wave 1):**

- [x] Migration: `shop_menu_items` table + index

**Chunk 2 — Worker Updates (Waves 2-3):**

- [x] Update `handle_enrich_menu_photo`: persist items + queue re-embed
- [x] Update `handle_generate_embedding`: menu items in text + live-shop guard

**Chunk 3 — Re-embed Script (Wave 4):**

- [x] Write `backend/scripts/reembed_live_shops.py`
- [ ] Post-deploy: dry-run then enqueue 164 jobs

### Search Observability (DEV-9)

> **Design Doc:** [docs/designs/2026-03-24-search-observability-design.md](docs/designs/2026-03-24-search-observability-design.md)
> **Plan:** [docs/plans/2026-03-24-search-observability-plan.md](docs/plans/2026-03-24-search-observability-plan.md)

**Chunk 1 — Foundation (Wave 1, parallel):**

- [x] DB migration: `search_events` table
- [x] Query type classifier (keyword heuristic + TDD)
- [x] Analytics provider `distinct_id` support + tests
- [x] Anonymize utility (`anonymize_user_id`) + tests

**Chunk 2 — Integration (Wave 2):**

- [x] Wire observability into search endpoint (fire-and-forget Postgres + PostHog)

**Chunk 3 — Config & Docs (Wave 3):**

- [x] Add `ANON_SALT` to env config and doctor check
- [x] Final verification + commit design doc and ADRs

### Check-in Review Embedding (DEV-7)

> **Design Doc:** [docs/designs/2026-03-24-checkin-review-embedding-design.md](docs/designs/2026-03-24-checkin-review-embedding-design.md)
> **Plan:** [docs/plans/2026-03-24-checkin-review-embedding-plan.md](docs/plans/2026-03-24-checkin-review-embedding-plan.md)

**Chunk 1 — Database (Wave 1-2, parallel):**

- [x] Migration: `shops.last_embedded_at` column
- [x] Add `REEMBED_REVIEWED_SHOPS` job type
- [x] RPC: `get_ranked_checkin_texts` (ranked text selection)
- [x] RPC: `find_shops_needing_review_reembed` (nightly cron query)

**Chunk 2 — Handler & Cron (Wave 3-4):**

- [x] Enhance `generate_embedding` handler with community text fetch
- [x] Nightly cron handler: `handle_reembed_reviewed_shops`
- [x] Wire cron job + dispatcher in scheduler

**Chunk 3 — Rollout & Verification (Wave 4-5):**

- [x] Re-embed script for initial rollout
- [x] Full lint, type-check, test suite verification

### Beta Program

- [ ] Recruit 30-50 beta users (personal network + Threads coffee community)
- [ ] LINE group for beta feedback collection
- [ ] Grant `blogger` role to beta invitees (SQL or admin UI)
- [ ] Iterate on beta feedback: data gaps, search quality issues, UX friction

### Activate Observability Stack

Code is merged and env-gated — nothing fires until these are set in Railway:

_Sentry:_

- [ ] Create Sentry project → set `SENTRY_DSN` (backend Railway service) and `NEXT_PUBLIC_SENTRY_DSN` (frontend Railway service)
- [ ] Create Sentry auth token → set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Railway (source map uploads on deploy)
- [ ] Trigger a test error post-deploy to confirm events arrive in Sentry

_PostHog:_

- [ ] Create PostHog project → set `NEXT_PUBLIC_POSTHOG_KEY` in Railway (frontend)
- [ ] Confirm `NEXT_PUBLIC_POSTHOG_HOST` is set (defaults to `https://app.posthog.com` if omitted)
- [ ] Verify pageview events in PostHog Live Events after first deploy
- [ ] Set `ANON_SALT` to a random secret in Railway backend service (`openssl rand -hex 32`) — default `caferoam-dev-salt` must not reach production

_Better Stack:_

- [ ] Create Better Stack account → follow `docs/ops/better-stack-setup.md` to add 3 monitors (API Health, Web Health, API Deep Health)
- [ ] Configure Slack/Discord webhook alert policy (2 consecutive failures before alert)
- [ ] Create `status.caferoam.com` status page → add CNAME in DNS

### Quality Gate

- [ ] Weekly curated email: implement real content algorithm (infrastructure is done — handler, scheduler, Resend provider all wired; only content logic is missing)
- [x] **[P3]** Add `slug: str | None = None` to Shop Pydantic model in `backend/models/types.py` — field is returned correctly but absent from model class (OpenAPI + type safety gap)
- [ ] Map performance audit: test on low-end Android devices
- [ ] Security review: RLS policies, PDPA flow, Sentry error baseline
- [ ] SQL lint passing on all migrations

### Launch

- [ ] Public Threads launch post with beta user testimonials

**Phase 4 is done when:** 20+ of 30 beta users say "better than Google Maps/Cafe Nomad." Public Threads post published. Better Stack shows 99%+ uptime during 2-week beta. 50+ WAU achieved.

---

## Backlog (Post-MVP)

Explicitly cut from V1. Revisit after Phase 4 validation data is in hand.

### Social & Community

- [ ] Public user profiles + social check-in feed
- [ ] Shareable curated lists (Letterboxd model: "My top 5 study cafes in Da'an")
- [ ] Community data contributions (flag outdated info, add new shops)
- [ ] Editorial community notes — standalone content type (not tied to check-ins), blogger writing UI, multi-shop lists, content moderation
- [ ] Comment threads on community notes
- [ ] Blogger profile pages (public-facing partner profiles)

### Monetization & Business

- [ ] Shop owner claiming + premium pages (analytics, menu management)
- [ ] CAFFÈCOIN integration (discovery → transaction affiliate)
- [ ] Sponsored / featured placement monetization

### Growth & Expansion

- [ ] Personalized weekly email (behavior-driven curation)
- [ ] Recommendation engine trained on real usage data
- [ ] Coverage expansion beyond Taipei
- [ ] Native iOS/Android app (after Threads distribution is proven)

### Incorrect-First-Attempts Prevention (Tooling)

> **Design:** [docs/designs/2026-03-12-incorrect-first-attempts-prevention-design.md](docs/designs/2026-03-12-incorrect-first-attempts-prevention-design.md)
> **Plan:** [docs/plans/2026-03-12-incorrect-first-attempts-prevention-plan.md](docs/plans/2026-03-12-incorrect-first-attempts-prevention-plan.md)

- [x] Global CLAUDE.md — pre-flight checks + file ownership (done in brainstorming session)
- [x] Feedback memories — branch discipline + supabase patterns (done in brainstorming session)
- [x] Pre-commit hook — branch guard + `.data[0]` + proxy layer checks (Task 1)
- [x] `docs/patterns/supabase-py.md` — correct API usage reference (Task 2)
- [x] Project CLAUDE.md — pre-flight + file ownership table (Task 3)
- [x] `/scope` SKILL.md — scaffold pre-commit + `docs/patterns/` for new projects (Task 4)
- [x] `/scope` templates — pre-flight + ownership sections (Task 5)

---

### Community Feed (DEV-12)

> **Design Doc:** [docs/designs/2026-03-24-community-feed-design.md](docs/designs/2026-03-24-community-feed-design.md)
> **Plan:** [docs/plans/2026-03-24-community-feed-plan.md](docs/plans/2026-03-24-community-feed-plan.md)

**Chunk 1 — Database + Backend Service (Wave 1-2):**

- [x] DB migration: add `is_public` column + RLS policies (Task 1)
- [x] CommunityService: `is_public` filter + MRT/vibe_tag params (Task 2)
- [x] CheckInService: accept `is_public` param (Task 4)

**Chunk 2 — API + Auth Gate (Wave 3):**

- [x] Auth-gate community feed/preview endpoints (Task 3)
- [x] Add MRT and vibe_tag filter query params (Task 3)

**Chunk 3 — Frontend (Wave 3-5):**

- [x] Check-in form: "Share publicly" toggle (Task 5)
- [x] Feed hook: auth fetcher + filter params (Task 6)
- [x] Feed page: filter bar UI (Task 7)
- [x] Explore preview: auth update (Task 8)

**Chunk 4 — Verification (Wave 6):**

- [x] Full lint + test pass (Task 9)

---

### Analytics Events Audit (DEV-16)

> **Design Doc:** [docs/designs/2026-03-24-analytics-events-audit-design.md](docs/designs/2026-03-24-analytics-events-audit-design.md)
> **Plan:** [docs/plans/2026-03-24-analytics-events-audit-plan.md](docs/plans/2026-03-24-analytics-events-audit-plan.md)

**Chunk 1 — Backend Models + Proxy (Wave 1):**

- [x] Pydantic event models with spec validation + PDPA filter (Task 1)
- [x] Next.js proxy route for POST /analytics/events (Task 4)

**Chunk 2 — Backend Endpoint + Search Migration (Wave 2):**

- [x] POST /analytics/events endpoint with enrichment (Task 2)
- [x] Remove inline PostHog from GET /search, add query metadata to response (Task 3)
- [x] Rewrite useAnalytics hook to POST to backend gateway (Task 5)

**Chunk 3 — Frontend Wiring (Wave 3-4):**

- [x] Update all frontend event call sites (Task 6)
- [x] Update frontend tests for changed components (Task 7)

**Chunk 4 — Verification (Wave 5):**

- [x] Full test suite + lint pass (Task 8)

---

### Phase-2 E2E Stubs (DEV-25)

> **Design Doc:** [docs/designs/2026-03-25-phase2-e2e-stubs-design.md](docs/designs/2026-03-25-phase2-e2e-stubs-design.md)
> **Plan:** [docs/plans/2026-03-25-phase2-e2e-stubs-plan.md](docs/plans/2026-03-25-phase2-e2e-stubs-plan.md)

**Chunk 1 — Community Feed Tests (Wave 1–2):**

- [x] J32: Like toggle increments count (`feed.spec.ts`)
- [x] J33: MRT filter scopes results (`feed.spec.ts`)

**Chunk 2 — Discovery & Explore Tests (Wave 1):**

- [x] J34: Tarot draw → 3 café cards revealed (`explore.spec.ts`)
- [x] J36: Get Directions → DirectionsSheet opens (`discovery.spec.ts`)

**Chunk 3 — Profile & Check-in Tests (Wave 1):**

- [x] J38: Account deletion cancel during grace period (`profile.spec.ts`)
- [x] J39: Check-in review text visible on shop page (`checkin.spec.ts`)

**Chunk 4 — Final Verification:**

- [x] Run all 6 journeys + full suite regression check

**Additional journeys also implemented in this branch (beyond original plan):**

- [x] J04: Browse map → tap pin → shop detail sheet (`discovery.spec.ts`)
- [x] J17: PWA manifest returns valid brand metadata + icons (`pwa.spec.ts`)
- [x] J20: Out-of-Taiwan geolocation → appropriate fallback (`edge-cases.spec.ts`)
- [x] J24: Duplicate stamp at same shop awards second stamp (`checkin.spec.ts`)
- [x] J26: Delete list removes it from lists page (`lists.spec.ts`)
- [x] J27: Remove shop from list updates shop count (`lists.spec.ts`)
- [x] J08: Work mode chip filters search results (`search.spec.ts`)
- [x] J09: Suggestion chip auto-fills search and shows results (`search.spec.ts`)

---

### Community Summary Embeddings (DEV-23)

> **Design Doc:** [docs/designs/2026-03-25-community-summary-embeddings-design.md](docs/designs/2026-03-25-community-summary-embeddings-design.md)
> **Plan:** [docs/plans/2026-03-25-community-summary-embeddings-plan.md](docs/plans/2026-03-25-community-summary-embeddings-plan.md)

**Chunk 1 — Foundation (Wave 1):**

- [x] DB migration: community_summary columns + job_type CHECK (Task 1)
- [x] Add SUMMARIZE_REVIEWS to Python JobType enum (Task 2)
- [x] Add summarize_reviews() to LLM provider protocol + adapter (Task 3)

**Chunk 2 — Handlers (Wave 2):**

- [x] handle_summarize_reviews worker handler (Task 4)
- [x] generate_embedding: prefer community_summary with raw-text fallback (Task 5)
- [x] reembed_reviewed_shops: enqueue SUMMARIZE_REVIEWS instead of GENERATE_EMBEDDING (Task 6)

**Chunk 3 — Wiring + Script (Wave 3):**

- [x] Scheduler dispatch for SUMMARIZE_REVIEWS (Task 7)
- [x] Backfill script for 164 live shops (Task 8)

**Chunk 4 — Verification (Wave 4):**

- [x] Full test suite + coverage gate pass (Task 9)

---

### LINE Integration (V2)

> Requires LINE Login (built in V1 auth) as prerequisite — LINE user ID is captured at auth time.

- [ ] LINE Official Account setup (LINE Developer Console)
- [ ] Push notifications via LINE Messaging API (replace or supplement weekly email)
- [ ] Rich menu: quick-access to search, check-in, lists from within LINE app
- [ ] Chatbot: natural language shop discovery via LINE chat (semantic search over Messaging API)

---

### SEO & GEO Optimization (DEV-14)

> **Design Doc:** [docs/designs/2026-03-25-seo-geo-optimization-design.md](docs/designs/2026-03-25-seo-geo-optimization-design.md)
> **Plan:** [docs/plans/2026-03-25-seo-geo-optimization-plan.md](docs/plans/2026-03-25-seo-geo-optimization-plan.md)

**Phase 1 — Technical Foundation:**

- [x] Backend: expose phone, website, hours, price in shop endpoint
- [x] robots.ts with AI bot allowances
- [x] Dynamic sitemap.ts for all live shops
- [x] llms.txt route handler for AI crawlers
- [x] JSON-LD base component
- [x] FAQ generation from taxonomy data
- [x] ShopJsonLd (CafeOrCoffeeShop + FAQPage schema)
- [x] WebsiteJsonLd (SearchAction schema)
- [x] Enhanced root layout metadata (metadataBase, OG, Twitter)
- [x] Integrate JSON-LD into shop detail page
- [x] Integrate JSON-LD into homepage
- [x] Explore + vibes page metadata
- [x] Verification & lint pass

**Phase 2 — Content Flywheel (future ticket):**

- [ ] Auto-generated landing pages per district/intent
- [ ] Freshness signals on shop pages

**Phase 3 — Authority (future):**

- [ ] Blog outreach to Taipei lifestyle/food blogs

---

### Community Summary Display (DEV-34)

> **Design Doc:** [docs/designs/2026-03-26-community-summary-display-design.md](docs/designs/2026-03-26-community-summary-display-design.md)
> **Plan:** [docs/plans/2026-03-26-community-summary-display-plan.md](docs/plans/2026-03-26-community-summary-display-plan.md)

**Chunk 1 — Backend (Wave 1):**

- [x] DB migration: add `community_summary` to `search_shops` RPC
- [x] Backend model: add `community_summary` to `Shop` + API column selections
- [x] Frontend types: add `communitySummary` to `Shop` TS interface

**Chunk 2 — Frontend Components (Wave 2-3):**

- [x] Create `CommunitySummary` component (sparkle icon + tooltip)
- [x] Add community snippet to `ShopCardCompact` (80-char truncation)
- [x] Integrate `CommunitySummary` into shop detail page (above Reviews)

**Chunk 3 — Verification (Wave 4):**

- [x] Lint, type-check, full test suite pass

---

### GA4 + Shared Cookie Consent Banner (DEV-30)

> **Design Doc:** [docs/designs/2026-03-26-ga4-consent-banner-design.md](docs/designs/2026-03-26-ga4-consent-banner-design.md)
> **Plan:** [docs/plans/2026-03-26-ga4-consent-banner-plan.md](docs/plans/2026-03-26-ga4-consent-banner-plan.md)

**Chunk 1 — Foundations:**

- [x] Install `@next/third-parties`
- [x] Create ConsentProvider + useConsent hook with tests

**Chunk 2 — Analytics Providers:**

- [x] Create CookieConsentBanner with tests
- [x] Create GA4Provider with consent mode v2 and tests
- [x] Gate PostHogProvider behind consent with updated tests

**Chunk 3 — Wiring + Events:**

- [x] Wire ConsentProvider, GA4, and banner into root layout
- [x] Create GA4 event helpers with tests
- [x] Update .env.example and doctor.sh

**Chunk 4 — Instrumentation + Verification:**

- [x] Instrument GA4 events on shop detail and search pages
- [x] Full test suite, lint, and type-check pass

---

### Shop Follower Subscriptions (DEV-20)

> **Design Doc:** [docs/designs/2026-03-26-shop-followers-design.md](docs/designs/2026-03-26-shop-followers-design.md)
> **Plan:** [docs/plans/2026-03-26-shop-followers-plan.md](docs/plans/2026-03-26-shop-followers-plan.md)

**Chunk 1 — Database + Backend Models:**

- [x] Create `shop_followers` migration with RLS
- [x] Add Pydantic response models (FollowResponse, FollowerCountResponse, etc.)

**Chunk 2 — Backend Service + API:**

- [x] Write FollowerService with TDD (follow, unfollow, count, following list)
- [x] Write follower API routes with TDD (POST/DELETE follow, GET count, GET following)

**Chunk 3 — Frontend:**

- [x] Add TypeScript types + `useShopFollow` hook
- [x] Create Next.js proxy routes
- [x] Build FollowButton component with TDD (heart toggle)
- [x] Integrate FollowButton into shop actions row
- [x] Add Following section + count to profile page

**Chunk 4 — Polish + Docs:**

- [x] Lint + type check + full test pass
- [x] Update SPEC.md, PRD.md, pricing strategy

### DEV-38: Community Shop Submission Pipeline

> **Design Doc:** [docs/designs/2026-03-26-community-shop-submission-design.md](docs/designs/2026-03-26-community-shop-submission-design.md)
> **Plan:** [docs/plans/2026-03-26-community-shop-submission-plan.md](docs/plans/2026-03-26-community-shop-submission-plan.md)

**Chunk 1 — DB Migration + Backend Pipeline:**

- [x] Expand shop_submissions table (pending_review status, rejection_reason column)
- [x] Add 5/day rate limit on submissions API
- [x] Route user submissions to pending_review in publish_shop handler

**Chunk 2 — Admin Endpoints:**

- [x] Update admin approve endpoint (set shop live + emit activity feed)
- [x] Update admin reject endpoint (canned reasons, keep shop row)

**Chunk 3 — Frontend API + Submit Page:**

- [x] Add GET /submissions endpoint + Next.js proxy
- [x] Build /submit page (form + submission history)

**Chunk 4 — Admin UI + Search CTAs:**

- [x] Update admin UI (rejection reason dropdown, pending_review status)
- [x] Add suggest-a-cafe CTAs to search page

**Chunk 5 — Verification:**

- [x] Full test pass + lint + type check
- [x] Commit design doc, ADR, spec/PRD updates

---

### Semantic Search Cache (DEV-36)

> **Design Doc:** [docs/designs/2026-03-26-semantic-search-cache-design.md](docs/designs/2026-03-26-semantic-search-cache-design.md)
> **Plan:** [docs/plans/2026-03-26-semantic-search-cache-plan.md](docs/plans/2026-03-26-semantic-search-cache-plan.md)

**Chunk 1 — Foundation (Wave 1):**

- [x] Migration: `search_cache` table with pgvector HNSW index
- [x] Migration: `cache_hit` column on `search_events`
- [x] Query normalizer + cache key hashing (TDD)
- [x] SearchCacheProvider protocol + factory
- [x] Config settings (TTL, threshold, provider)

**Chunk 2 — Adapters (Wave 2):**

- [x] NullSearchCacheAdapter + factory tests
- [x] SupabaseSearchCacheAdapter (TDD)
- [x] RPC functions: `search_cache_similar`, `increment_search_cache_hit`

**Chunk 3 — Integration (Wave 3-4):**

- [x] Integrate cache into SearchService (TDD)
- [x] Wire cache into search API endpoint
- [x] Lint + type check + full test pass

**Chunk 4 — Docs:**

- [x] Update `.env.example` and doctor script

### E2E: Community Shop Submission Journey (DEV-62)

> **Design Doc:** [docs/designs/2026-03-26-e2e-submit-journey-design.md](docs/designs/2026-03-26-e2e-submit-journey-design.md)
> **Plan:** [docs/plans/2026-03-26-e2e-submit-journey-plan.md](docs/plans/2026-03-26-e2e-submit-journey-plan.md)

**Wave 1 — Setup:**

- [x] Add `/submit` to auth wall protected routes (auth.spec.ts)
- [x] Create submit.spec.ts with happy path (@critical J40)

**Wave 2 — Edge Cases:**

- [x] Add duplicate guard test (409 error handling)
- [x] Add URL validation test (client-side, no API call)

**Wave 3 — Verification:**

- [x] Full E2E suite regression check (mobile + desktop)

### E2E: Shop Follow/Unfollow Journey (DEV-61)

> **Design Doc:** [docs/designs/2026-03-26-e2e-follow-unfollow-design.md](docs/designs/2026-03-26-e2e-follow-unfollow-design.md)
> **Plan:** [docs/plans/2026-03-26-e2e-follow-unfollow-plan.md](docs/plans/2026-03-26-e2e-follow-unfollow-plan.md)

**Chunk 1 — E2E Spec:**

- [x] J40: Follow/unfollow button state toggle (serial)
- [x] J41: Follow auth wall redirect to /login

**Chunk 2 — Docs:**

- [x] Update E2E journey inventory (J40, J41)

## Railway Staging Deployment (DEV-73)

> **Design Doc:** [docs/designs/2026-03-30-railway-staging-deployment-design.md](docs/designs/2026-03-30-railway-staging-deployment-design.md)
> **Plan:** [docs/plans/2026-03-30-railway-staging-deployment-plan.md](docs/plans/2026-03-30-railway-staging-deployment-plan.md)

**Wave 1 — Code changes (parallel):**

- [x] Task 1: Fix frontend Sentry environment tagging (DEV-97)
- [x] Task 2: Add missing env vars to .env.example
- [x] Task 3: Update doctor.sh with Railway check

**Wave 2 — Railway setup:**

- [x] Task 4: Create Railway project + link GitHub repo (DEV-95)

**Wave 3 — Wire env vars:**

- [x] Task 5: Wire all 34 env vars to Railway services (DEV-96)

**Wave 4 — Deploy + verify:**

- [x] Task 6: Trigger first deploy + verify health checks (DEV-98)

**Wave 5 — Observability:**

- [ ] Task 7: Set up Better Stack monitors + verify PostHog/Sentry (DEV-99) — deferred, see DEV-100
