# Technical Specification: CafeRoam (啡遊)

> Last updated: 2026-03-02
> For complete product requirements: see PRD.md

---

## 1. Tech Stack

| Layer            | Choice                            | Notes                                                |
| ---------------- | --------------------------------- | ---------------------------------------------------- |
| Frontend         | Next.js 16 (App Router)           | SSR/SSG for SEO, mobile-first, shareable URLs        |
| Frontend lang    | TypeScript (strict)               | Frontend + prebuild data pipeline only               |
| Backend          | FastAPI (Python 3.12+)            | API + workers + business logic                       |
| Backend lang     | Python (typed, mypy-checked)      | All backend services, providers, workers             |
| Database         | Supabase (Postgres 15 + pgvector) | Vector search, auth, storage in one platform         |
| Auth             | Supabase Auth                     | Email/password + social login options                |
| Hosting          | Railway (two services)            | Next.js frontend + Python API/workers, same monorepo |
| Styling          | Tailwind CSS + shadcn/ui          | Fast iteration, mobile-first design                  |
| Frontend testing | Vitest + Testing Library          | Frontend unit + integration tests                    |
| Backend testing  | pytest + pytest-asyncio           | API + service + worker tests                         |
| Maps             | Mapbox GL JS                      | Abstracted behind MapsProvider protocol              |
| Storage          | Supabase Storage                  | Check-in photos, menu photos; RLS enforced           |
| Error tracking   | Sentry                            | Frontend + backend, free tier at launch              |
| Analytics        | PostHog                           | Via AnalyticsProvider protocol abstraction           |
| Uptime           | Better Stack                      | 30-second checks, Slack/Discord + email alerts       |

**Full rationale for each choice:** see `docs/decisions/`

---

## 2. System Modules

| Module                | Responsibility                                                                                                                                                                                                                                                                       | Phase |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Data pipeline         | One-time data collection (Cafe Nomad seed → Apify/Google Maps verify + scrape) + ongoing enrichment (Claude Haiku + embedding generation)                                                                                                                                            | 1     |
| Taxonomy system       | Canonical tag database; powers filter UI and search ranking                                                                                                                                                                                                                          | 1     |
| Auth system           | Supabase Auth, session management, route protection, PDPA consent                                                                                                                                                                                                                    | 1     |
| Provider abstractions | LLMProvider, EmbeddingsProvider, EmailProvider, MapsProvider, AnalyticsProvider (Python Protocol classes)                                                                                                                                                                            | 1     |
| Admin/ops             | Internal data quality dashboard, manual enrichment and verification UI                                                                                                                                                                                                               | 1     |
| Background workers    | FastAPI embedded workers (APScheduler): enrichment, embedding refresh, weekly email cron                                                                                                                                                                                             | 1     |
| Shop directory        | Map + list directory view now lives at `/find`; mobile list view + mobile/desktop map view; responsive layouts at ≥1024px; geolocation; multi-dimension filters                                                                                                                      | 2     |
| Semantic search       | pgvector similarity + taxonomy boost; AI search bar is the homepage hero at `/`; suggestion chips and mode chips (work/rest/social) on Home; name search also available                                                                                                              | 2     |
| Explore               | `/explore/vibes/[slug]` — Vibe category page with collapsible map panel (expanded by default), multi-select district filter chips, and "Near Me" toggle. Shows all matching shops by default (no geo-gating). Map uses existing Mapbox integration with bidirectional pin-list sync. | 2     |
| User lists            | Create/edit/delete (max 3), add/remove shops                                                                                                                                                                                                                                         | 2     |
| Check-in system       | Standalone check-in page; photo upload (required), text note (optional), menu photo (optional); stamp generation; unlocks review                                                                                                                                                     | 2     |
| Reviews               | Check-in-gated reviews: star rating + text, one review per user per shop, visible to logged-in users on Shop Detail page                                                                                                                                                             | 2     |
| User profile          | Private profile page: check-in history, stamp collection, lists                                                                                                                                                                                                                      | 2     |
| Retention             | Weekly curated email (fixed schedule), stamp collection display                                                                                                                                                                                                                      | 3     |
| Shop followers        | `shop_followers` table: user_id + shop_id unique pair, created_at. Indexes on both FKs. Follow/unfollow toggle on shop page; follower count display (≥10 threshold).                                                                                                                 | 3     |
| Shop data reports     | User-facing mechanism to flag incorrect shop data. Reports stored in `shop_reports` table, batched daily into a Linear issue via `IssueTrackerProvider` cron.                                                                                                                        | 3     |

---

## 3. Architecture Overview

CafeRoam is a monorepo with two Railway services: a Next.js frontend (TypeScript) and a FastAPI backend (Python). Supabase provides the data backend (Postgres + pgvector, auth, storage). The Next.js frontend handles SSR/SSG pages and thin API proxy routes. The Python backend handles all business logic, provider integrations, and background workers.

**Frontend → Backend communication:** Next.js API routes act as thin proxies, forwarding requests (with auth headers) to the Python backend via Railway's internal network. The Python API is not publicly exposed.

**Semantic search flow:** User query → Next.js proxy → FastAPI route → embed query via EmbeddingsProvider (OpenAI text-embedding-3-small) → pgvector similarity search on Supabase → taxonomy tag boost (structured component) → ranked results → response. This hybrid approach (vector similarity + taxonomy boost) handles both natural language queries and attribute-specific queries ("must have outlets") better than pure vector search.

**Check-in flow:** User uploads photo → Next.js proxy → FastAPI route → validate auth + photo → Supabase Storage → stamp awarded → optional: menu photo queued for enrichment worker → Claude extracts structured menu data → merged into shop record.

**Provider abstraction pattern:** All external services (LLM, embeddings, email, maps, analytics) are accessed via Python `Protocol` classes. Business logic imports only protocols — never provider SDKs. Factory functions select the active provider from env vars and are wired via FastAPI's `Depends()` system for dependency injection and test mocking.

```
backend/providers/
├── llm/
│   ├── interface.py              # LLMProvider protocol
│   ├── anthropic_adapter.py      # Claude (default)
│   └── __init__.py               # factory: get_llm_provider()
├── embeddings/
│   ├── interface.py              # EmbeddingsProvider protocol
│   ├── openai_adapter.py         # text-embedding-3-small (default)
│   └── __init__.py
├── email/
│   ├── interface.py              # EmailProvider protocol
│   ├── resend_adapter.py         # Resend (default)
│   └── __init__.py
├── maps/
│   ├── interface.py              # MapsProvider protocol
│   ├── mapbox_adapter.py         # Mapbox GL JS (default)
│   └── __init__.py
└── analytics/
    ├── interface.py              # AnalyticsProvider protocol
    ├── posthog_adapter.py        # PostHog (default)
    └── __init__.py
```

---

## 4. Hard Dependencies

Things that must exist for this product to ship. If any of these slip, the timeline slips.

| Dependency                    | Type                              | Provider Abstracted       | Risk if unavailable                             |
| ----------------------------- | --------------------------------- | ------------------------- | ----------------------------------------------- |
| Supabase                      | Database + Auth + Storage         | No (core infrastructure)  | Complete block                                  |
| Railway                       | App hosting + worker runtime      | No (infrastructure)       | Deployment blocked                              |
| Apify                         | Google Maps data scraping         | Lightweight wrapper       | Data pipeline blocked                           |
| Claude Haiku (Anthropic)      | LLM enrichment + taxonomy tagging | Yes — ILLMProvider        | Enrichment quality degraded; fallback to manual |
| OpenAI text-embedding-3-small | Vector embeddings for search      | Yes — IEmbeddingsProvider | Semantic search blocked                         |
| Mapbox GL JS                  | Map rendering                     | Yes — IMapsProvider       | Map view unavailable; list view unaffected      |
| Resend (default)              | Transactional email               | Yes — IEmailProvider      | Weekly email blocked                            |
| PostHog                       | Product analytics                 | Yes — IAnalyticsProvider  | Analytics blind; product still functional       |

**LLM enrichment rationale:** Claude Haiku chosen over GPT-4o for structured extraction with constrained output (taxonomy mapping). Claude consistently outperforms on instruction-following when output is constrained to a predefined list — critical for clean taxonomy tagging. Fast and cheap for batch processing. User maintains separate Anthropic service account for CafeRoam.

**Embeddings rationale:** OpenAI text-embedding-3-small is the pragmatic choice — ~$0.02/1M tokens, reliable, best pgvector ecosystem support. Anthropic does not offer standalone embedding models. Google text-embedding-004 is the preferred fallback if OpenAI is unavailable (user has Gemini subscription).

---

## 5. Compliance & Security

- **Compliance:** Taiwan PDPA (個人資料保護法). Key requirements: explicit consent at signup for data collection purposes; user right to delete account + all personal data within 30 days; purpose limitation — disclose that check-in photos may inform data enrichment; data retention policy for photos and check-in history. See [`docs/legal/data-retention-policy.md`](docs/legal/data-retention-policy.md) for full retention schedule.
- **PDPA checkpoints during build:** Consent flow at signup (includes shop owner analytics disclosure), account deletion endpoint (cascades all user data: check-ins, photos, lists, polaroids, profile), privacy policy page (`/privacy`), photo usage disclosure on check-in flow, consent withdrawal toggle in profile settings.
- `shop_reports.user_id` → ON DELETE SET NULL (anonymize report, preserve content for ops triage)
- **Auth mechanism:** Supabase Auth (JWT-based sessions). Server-side session validation on all protected API routes.
- **Secrets management:** Environment variables only. `.env` and `.env.local` are gitignored. `.env.example` documents all required vars with descriptions.
- **Encryption:** In transit: TLS/HTTPS (Railway + Supabase enforce). At rest: Supabase Storage encrypts by default.
- **Data residency:** Supabase region — `ap-northeast-1` (Tokyo; lowest latency to Taiwan at ~20ms).
- **RLS:** Supabase Row Level Security enabled on all user-facing tables. Users can only read/write their own data (check-ins, lists, stamps, profile).

### Anti-Crawling & Abuse Prevention

**Rate Limiting:**

- Global default: 60 requests/minute per IP on all API routes
- `/search`: 10 requests/minute per authenticated user (per-user, not per-IP)
- `/maps/directions`: 30 requests/minute per IP
- `/shops/` (list): 30 requests/minute per IP
- Health endpoints exempt from all rate limits
- All thresholds env-configurable (e.g., `RATE_LIMIT_DEFAULT`, `RATE_LIMIT_SEARCH`)
- In-memory state (resets on deploy); upgrade to Redis planned for scale

**Bot Detection:**

- BotDetectionMiddleware runs outermost in the middleware chain
- Blocks: empty User-Agent, known scraper UAs (curl, scrapy, python-requests, etc.)
- Flags as suspicious: requests missing 2+ browser headers (Accept, Accept-Language, Accept-Encoding)
- Allows: legitimate crawlers (Googlebot, Bingbot, etc.) via configurable allowlist
- Killswitch: `BOT_DETECTION_ENABLED=false`

**Alerting:**

- Bot blocks and rate limit violations logged as structured events (`event_type=bot_detection|rate_limit`)
- Sentry breadcrumbs attached for correlation with downstream errors

Note: These are security rate limits distinct from feature caps (e.g., 5 AI searches/day in §9 Business Rules). Feature caps are monetization gates; security rate limits prevent infrastructure abuse.

---

## 6. Observability

- **Error tracking:** Sentry — captures frontend + API route errors. Alert on new error types. Free tier sufficient at launch.
- **Logging:** Railway built-in log viewer for app and worker logs. Structured JSON logs.
- **Uptime monitoring:** Better Stack — 30-second checks on production URLs. Slack/Discord + email alerts on downtime. Public status page.
- **Analytics:** PostHog via IAnalyticsProvider. Seven instrumented events (defined in `docs/designs/ux/metrics.md`): `search_submitted` (query_text, query_type, mode_chip_active, result_count), `shop_detail_viewed` (shop_id, referrer, session_search_query), `shop_url_copied` (shop_id, copy_method), `checkin_completed` (shop_id, is_first_checkin_at_shop, has_text_note, has_menu_photo), `profile_stamps_viewed` (stamp_count), `filter_applied` (filter_type, filter_value), `session_start` (days_since_first_session, previous_sessions). `query_type` classification runs server-side. Never log user PII in analytics events.
- **Alerting:** Sentry (new errors, email), Better Stack (downtime, Slack/Discord), Railway (worker crash logs).

---

## 7. Dev Environment

- **Target setup time:** Under 15 minutes from `git clone` to running app
- **Prerequisites:** Node.js 20+, pnpm, Python 3.12+, uv (Python package manager), Docker Desktop, Supabase CLI, Railway CLI

```bash
git clone <repo> && cd caferoam
cp .env.example .env.local     # Fill in API keys (~2 min)
pnpm setup                     # Runs all steps automatically

# What pnpm setup does:
# 1. pnpm install                        (~2 min — frontend deps)
# 2. cd backend && uv sync               (~1 min — Python backend deps)
# 3. supabase start                      (~3 min first time — pulls Docker images)
# 4. supabase db push                    (~30 sec)
# 5. pnpm db:seed                        (~1 min — imports ~50 Taipei shops)
# 6. pnpm dev                            (starts Next.js on :3000 + FastAPI on :8000)
```

- **Makefile shortcuts:** `make migrate`, `make seed`, `make reset-db`, `make backend`, `make test-backend`
- **Local Supabase:** Full Postgres + pgvector + auth + storage runs in Docker — no cloud credentials needed for local development.
- **Backend dev server:** `cd backend && uvicorn main:app --reload --port 8000`

---

## 8. Technical Constraints & Known Trade-offs

- **Supabase vendor dependency:** Auth, database, and storage are all Supabase. Moving off requires significant migration work. Accepted: speed of launch outweighs flexibility at this stage.
- **pgvector hybrid search:** Pure vector similarity degrades for attribute-specific queries ("must have outlets"). The taxonomy tag boost mitigates this, but search quality is ultimately bounded by enrichment data quality.
- **Map performance on low-end devices:** Mapbox GL JS can be heavy on older Android devices common in Taiwan. Mitigation: lazy-load the map, only render pins in viewport, provide list view as fallback.
- **Data freshness:** Enriched data degrades as shops change menus, hours, or close. Check-in menu photos partially automate refresh, but periodic manual verification is an ongoing maintenance task.
- **Railway vs serverless:** Railway runs as persistent services (not serverless functions), which means no cold starts and no timeout limits on long-running enrichment jobs — a deliberate choice for the data pipeline.
- **Two-language stack:** TypeScript (frontend) + Python (backend) means two dependency systems and two testing frameworks. Accepted: team productivity in Python and access to the Python AI/ML ecosystem outweigh the overhead. The prebuild data pipeline stays in TypeScript as it's already working.
- **Solo dev timeline:** 2-4 weeks is aggressive. The 30-shop data enrichment + semantic search prototype (week 0) must prove the wedge before investing in full build.

---

## 9. Business Rules

> This section is checked by every /brainstorming session before designing a feature. Keep it current. Any rule that shapes how the system behaves goes here.

- **Auth wall:** Unauthenticated users can browse directory (list view, map view, shop detail, filters). Shop detail shows aggregate data publicly (rating, check-in count, top tags, 1-2 photos) for SEO; full reviews, community check-ins, and detailed photos require auth. Semantic search, keyword search, user lists, check-ins, and profile require auth. See `docs/strategy/2026-03-25-pricing-tiers-strategy.md` for full tier definition.
- **Semantic search is auth-gated:** The chatbox on the landing page is visible to all users but prompts login when submitted without an active session. Free (auth) users get 5 AI searches per day; after the cap, results fall back to keyword search with an upgrade nudge. Member tier gets unlimited AI searches. Name-based (keyword) search is free for all users with no cap. Unauthenticated users get 1 free semantic search try per session before being prompted to log in.
- **Lists cap:** A user can have at most 3 lists. Enforced at the API level, not just UI. Exceeding 3 returns a 400 error.
- **Lists are private in V1:** No user can view another user's lists. No shareable list links in V1.
- **Check-in requires photo:** At least one photo upload is mandatory for a check-in to be recorded. Text note is optional. Menu photo is optional.
- **Check-in deduplication:** A user can check in to the same shop multiple times. No deduplication — multiple visits earn multiple polaroids (intended collection mechanic).
- **Polaroid wall:** Each check-in generates a polaroid-style photo card, unique per shop visit. Multiple check-ins at the same shop create multiple polaroids. Polaroids are non-transferable and non-purchasable in V1.
- **Profile is private:** The user profile page is only accessible to the authenticated user who owns it. Not publicly viewable in V1.
- **Weekly email:** Fixed schedule. All opted-in users receive the same curated content in V1. No personalization until usage data exists.
- **PDPA data deletion:** Account deletion must cascade all personal data: check-in photos (Supabase Storage), text notes, lists, polaroids, profile data. Must complete within 30 days of request. Non-negotiable — must be built before launch.
- **Provider abstraction:** Business logic never imports provider SDKs directly. All external services accessed via Python Protocol classes in `backend/providers/`.
- **Taxonomy is canonical:** Filter UI options and LLM enrichment prompts both derive from the taxonomy table. Adding a new tag to the taxonomy automatically makes it available in filters and future enrichment runs.
- **Check-in entry point:** The check-in flow is triggered from the Shop View — a bottom sheet on mobile, a popover on desktop. The standalone `/checkin/[shopId]` page is kept as a deep-link fallback (e.g. push notification or direct URL). The sheet shows a simplified form (photo required, rating + review text optional). Taxonomy tag confirmation is only available on the full `/checkin/[shopId]` page.
- **Reviews are check-in-gated:** A user can leave a star rating + text review as part of any check-in, or add one later to an existing check-in. Reviews are optional — a check-in with no review is valid. One review per check-in (multiple visits = multiple reviews). Stars (1-5) are required for a review; text and taxonomy tag confirmations are optional. Reviews are stored as columns on the `check_ins` table. User reviews are displayed separately from Google scraper reviews. Reviews are visible to logged-in users only on Shop Detail.
- **Check-in public toggle:** Each check-in has an `is_public` boolean (default `true`). Public check-ins appear in the community feed. Users can toggle this in the check-in form. Private check-ins are only visible to the author on their profile.
- **Community feed access:** The community feed (`/explore/community`) shows all public check-ins with review text. Requires authentication — anonymous users cannot view the feed. Feed supports district and vibe tag filters. Free (auth) users see up to 10-15 full-quality check-in cards per day; subsequent cards are blurred with an upgrade CTA. Member tier sees the feed without limits.
- **Community feed does not require a role:** Any authenticated user's public check-ins appear in the feed. The `user_roles` table is used for display badges (blogger, partner, admin) only — not for gating visibility.
- **Role hierarchy:** Six levels — `user` (anonymous, no auth), `auth-user` (signed up, free tier), `member` (paid subscription, NT$59/mo), `blogger`, `partner`, `admin`. Community feed readable by `auth-user` and above. Feature caps apply to `auth-user`; `member` has no caps. Detailed role permissions deferred to implementation of DEV-17.
- **Check-in social visibility:** On Shop Detail, unauthenticated visitors see only the total check-in count and one representative photo. Logged-in users see the full Recent Check-ins strip (photo thumbnails with @username and date). The community feed is a separate surface from Shop Detail.
- **Community shop submissions:** Any authenticated user can submit a Google Maps URL to add a café. Submissions are enriched via the existing pipeline (scrape → enrich → embed) and held in `pending_review` for admin approval before going live. Rate-limited to 5 submissions per day per user. Users can track their submission status on `/submit`. Admin reviews on the `/admin` page with approve/reject + canned rejection reasons. PDPA cascade on account deletion must include `shop_submissions` rows (already handled via FK ON DELETE CASCADE).
- **Payment methods:** Six supported methods: cash, card, line_pay, twqr, apple_pay, google_pay. Stored as `payment_methods` JSONB on shops. Values: `true` (accepted), `false` (not accepted), `null`/missing (unknown, hidden from UI). Community confirmations via `shop_payment_confirmations` table (auth-gated, one vote per user per method per shop). PDPA cascade via `ON DELETE CASCADE` on user_id FK.
- **Payment method filters:** "Cash Only" and "Mobile Payment" filters on the Find page use taxonomy tags (`cash_only`, `mobile_payment`) — not the `payment_methods` JSONB column.
- **Shop following:** Any authenticated user (Free or Member) can follow/unfollow shops. Follower count is publicly visible only when ≥ 10; below that threshold the count is hidden. Follow is separate from lists — different intent (broadcast updates vs. organization). PDPA cascade on account deletion must include `shop_followers` rows.
- **Responsive layouts (UX-defined):** Two distinct layout sets exist. Mobile (< 1024px): Home `/` (search-first Option B layout — centered search bar hero, suggestion chips, mode chips [work/rest/social], featured shops list; no map on homepage), Find `/find` (full-bleed map + glassmorphism overlay with list toggle), Shop Detail (single-column scroll). Desktop (≥ 1024px): Home `/` (search-first landing, centered search bar, suggestion chips, mode chips, featured shops list, no hero map), Find `/find` (full-viewport map + floating card), Shop Detail (single-column scroll on all breakpoints — the 2-column desktop layout was removed in the 2026-03-20 Shop View reconstruct; see docs/designs/2026-03-20-shop-view-ui-reconstruct-design.md). See `docs/designs/ux/DESIGN_HANDOFF.md` for approved screenshots and layout intent. Explore vibes `/explore/vibes/[slug]` (collapsible map panel at top, expanded by default; collapses to toggle button).
- **Geolocation fallback:** When geolocation is unavailable, the Explore page defaults to a district picker. Users can select one or more Taipei districts to scope Tarot Draw results. Multiple districts are combined with OR logic. The district picker is always visible regardless of GPS state, with "Near Me" as the default when GPS is available.

  **GPS status feedback (Explore page):**
  - **Loading:** Near Me pill pulses; subtitle shows "Finding your location…"
  - **Active:** Subtitle shows "Within {radius} km of you" (default 3 km, expandable to 10 km)
  - **Denied/unavailable:** Near Me pill disabled; subtitle shows "Location unavailable — pick a district to explore"; first district auto-selected
  - **District selected:** No subtitle shown
    > **Note:** Public-facing CTAs (footer, home page, search no-results) link to `/submit`. Unauthenticated users are redirected to login via the `(protected)` route group before reaching the submission form.

### Shop Data Reports

- Any user (authenticated or anonymous) can report incorrect data on a published shop.
- Reports include an optional field selector (hours, wifi, name, other) and a required free-text description (min 5 chars).
- Rate-limited to 5 reports per day per IP address.
- Reports stored in `shop_reports` with status lifecycle: pending → sent_to_linear → resolved.
- Daily 9am Taiwan time cron batches all pending reports into a single Linear issue with a markdown checklist.
- Each report row is marked `sent_to_linear` after batching — no double-sends.
- PDPA: user_id (nullable) set to NULL on account deletion; report content preserved.
