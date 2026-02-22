# Technical Specification: CafeRoam (啡遊)

> Last updated: 2026-02-23
> For complete product requirements: see PRD.md

---

## 1. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 (App Router) | SSR/SSG for SEO, mobile-first, shareable URLs |
| Language | TypeScript (strict) | Full-stack including workers |
| Database | Supabase (Postgres 15 + pgvector) | Vector search, auth, storage in one platform |
| Auth | Supabase Auth | Email/password + social login options |
| Hosting | Railway | Next.js app + background workers, single platform, ~$5/mo |
| Styling | Tailwind CSS + shadcn/ui | Fast iteration, mobile-first design |
| Testing | Vitest + Testing Library | Unit + integration tests |
| Maps | Mapbox GL JS | Abstracted behind IMapsProvider interface |
| Storage | Supabase Storage | Check-in photos, menu photos; RLS enforced |
| Error tracking | Sentry | Frontend + backend, free tier at launch |
| Analytics | PostHog | Via IAnalyticsProvider abstraction |
| Uptime | UptimeRobot | 5-minute checks, email alerts |

**Full rationale for each choice:** see `docs/decisions/`

---

## 2. System Modules

| Module | Responsibility | Phase |
|--------|---------------|-------|
| Data pipeline | Cafe Nomad import, Apify scraping, Claude Haiku enrichment, embedding generation | 1 |
| Taxonomy system | Canonical tag database; powers filter UI and search ranking | 1 |
| Auth system | Supabase Auth, session management, route protection, PDPA consent | 1 |
| Provider abstractions | ILLMProvider, IEmbeddingsProvider, IEmailProvider, IMapsProvider, IAnalyticsProvider | 1 |
| Admin/ops | Internal data quality dashboard, manual enrichment and verification UI | 1 |
| Background workers | Railway workers: Apify triggers, embedding refresh, weekly email cron | 1 |
| Shop directory | List view + map view toggle, geolocation, multi-dimension filters | 2 |
| Semantic search | pgvector similarity + taxonomy boost, chatbox UI on landing page | 2 |
| User lists | Create/edit/delete (max 3), add/remove shops | 2 |
| Check-in system | Photo upload, optional text + menu photo, stamp generation | 2 |
| User profile | Private profile page: check-in history, stamps earned, lists | 2 |
| Retention | Weekly curated email (fixed schedule), stamp collection display | 3 |

---

## 3. Architecture Overview

CafeRoam is a Next.js monorepo deployed on Railway with Supabase as the data backend. Two main deployment targets: the Next.js web app (SSR/SSG pages + API routes) and Railway background workers (long-running processes for data enrichment and cron jobs).

**Semantic search flow:** User query → Next.js API route → embed query via IEmbeddingsProvider (OpenAI text-embedding-3-small) → pgvector similarity search on Supabase → taxonomy tag boost (structured component) → ranked results → response. This hybrid approach (vector similarity + taxonomy boost) handles both natural language queries and attribute-specific queries ("must have outlets") better than pure vector search.

**Check-in flow:** User uploads photo → Next.js API route → validate auth + photo → Supabase Storage → stamp awarded → optional: menu photo queued for enrichment worker → Claude Haiku extracts structured menu data → merged into shop record.

**Provider abstraction pattern:** All external services (LLM, embeddings, email, maps, analytics) are accessed via TypeScript interfaces. Business logic imports only interfaces — never provider SDKs. Environment variables select the active provider via factory functions. This enables swapping providers (e.g., Resend → SendGrid) with zero business logic changes.

```
lib/providers/
├── llm/
│   ├── llm.interface.ts          # ILLMProvider
│   ├── anthropic.adapter.ts      # Claude Haiku (default)
│   └── index.ts                  # factory: reads LLM_PROVIDER env var
├── embeddings/
│   ├── embeddings.interface.ts   # IEmbeddingsProvider
│   ├── openai.adapter.ts         # text-embedding-3-small (default)
│   └── index.ts
├── email/
│   ├── email.interface.ts        # IEmailProvider
│   ├── resend.adapter.ts         # Resend (default)
│   └── index.ts
├── maps/
│   ├── maps.interface.ts         # IMapsProvider
│   ├── mapbox.adapter.ts         # Mapbox GL JS (default)
│   └── index.ts
└── analytics/
    ├── analytics.interface.ts    # IAnalyticsProvider
    ├── posthog.adapter.ts        # PostHog (default)
    └── index.ts
```

---

## 4. Hard Dependencies

Things that must exist for this product to ship. If any of these slip, the timeline slips.

| Dependency | Type | Provider Abstracted | Risk if unavailable |
|------------|------|--------------------|--------------------|
| Supabase | Database + Auth + Storage | No (core infrastructure) | Complete block |
| Railway | App hosting + worker runtime | No (infrastructure) | Deployment blocked |
| Apify | Google Maps data scraping | Lightweight wrapper | Data pipeline blocked |
| Claude Haiku (Anthropic) | LLM enrichment + taxonomy tagging | Yes — ILLMProvider | Enrichment quality degraded; fallback to manual |
| OpenAI text-embedding-3-small | Vector embeddings for search | Yes — IEmbeddingsProvider | Semantic search blocked |
| Mapbox GL JS | Map rendering | Yes — IMapsProvider | Map view unavailable; list view unaffected |
| Resend (default) | Transactional email | Yes — IEmailProvider | Weekly email blocked |
| PostHog | Product analytics | Yes — IAnalyticsProvider | Analytics blind; product still functional |

**LLM enrichment rationale:** Claude Haiku chosen over GPT-4o for structured extraction with constrained output (taxonomy mapping). Claude consistently outperforms on instruction-following when output is constrained to a predefined list — critical for clean taxonomy tagging. Fast and cheap for batch processing. User maintains separate Anthropic service account for CafeRoam.

**Embeddings rationale:** OpenAI text-embedding-3-small is the pragmatic choice — ~$0.02/1M tokens, reliable, best pgvector ecosystem support. Anthropic does not offer standalone embedding models. Google text-embedding-004 is the preferred fallback if OpenAI is unavailable (user has Gemini subscription).

---

## 5. Compliance & Security

- **Compliance:** Taiwan PDPA (個人資料保護法). Key requirements: explicit consent at signup for data collection purposes; user right to delete account + all personal data within 30 days; purpose limitation — disclose that check-in photos may inform data enrichment; data retention policy for photos and check-in history.
- **PDPA checkpoints during build:** Consent flow at signup, account deletion endpoint (cascades all user data: check-ins, photos, lists, stamps, profile), privacy policy page, photo usage disclosure on check-in flow.
- **Auth mechanism:** Supabase Auth (JWT-based sessions). Server-side session validation on all protected API routes.
- **Secrets management:** Environment variables only. `.env` and `.env.local` are gitignored. `.env.example` documents all required vars with descriptions.
- **Encryption:** In transit: TLS/HTTPS (Railway + Supabase enforce). At rest: Supabase Storage encrypts by default.
- **Data residency:** Supabase region — `ap-southeast-1` (Singapore; closest to Taiwan).
- **RLS:** Supabase Row Level Security enabled on all user-facing tables. Users can only read/write their own data (check-ins, lists, stamps, profile).

---

## 6. Observability

- **Error tracking:** Sentry — captures frontend + API route errors. Alert on new error types. Free tier sufficient at launch.
- **Logging:** Railway built-in log viewer for app and worker logs. Structured JSON logs.
- **Uptime monitoring:** UptimeRobot — 5-minute checks on production URL. Email alert on downtime.
- **Analytics:** PostHog via IAnalyticsProvider. Tracks: search queries (anonymized), filter usage, check-in events, WAU, funnel from landing → auth → search. Never log user PII in analytics events.
- **Alerting:** Sentry (new errors), UptimeRobot (downtime), Railway (worker crash logs).

---

## 7. Dev Environment

- **Target setup time:** Under 15 minutes from `git clone` to running app
- **Prerequisites:** Node.js 20+, pnpm, Docker Desktop, Supabase CLI, Railway CLI

```bash
git clone <repo> && cd caferoam
cp .env.example .env.local     # Fill in API keys (~2 min)
pnpm setup                     # Runs all steps automatically

# What pnpm setup does:
# 1. pnpm install                        (~2 min)
# 2. supabase start                      (~3 min first time — pulls Docker images)
# 3. supabase db push                    (~30 sec)
# 4. pnpm db:seed                        (~1 min — imports ~50 Taipei shops)
# 5. pnpm dev                            (starts Next.js on :3000)
```

- **Makefile shortcuts:** `make migrate`, `make seed`, `make reset-db`, `make workers`
- **Local Supabase:** Full Postgres + pgvector + auth + storage runs in Docker — no cloud credentials needed for local development.

---

## 8. Technical Constraints & Known Trade-offs

- **Supabase vendor dependency:** Auth, database, and storage are all Supabase. Moving off requires significant migration work. Accepted: speed of launch outweighs flexibility at this stage.
- **pgvector hybrid search:** Pure vector similarity degrades for attribute-specific queries ("must have outlets"). The taxonomy tag boost mitigates this, but search quality is ultimately bounded by enrichment data quality.
- **Map performance on low-end devices:** Mapbox GL JS can be heavy on older Android devices common in Taiwan. Mitigation: lazy-load the map, only render pins in viewport, provide list view as fallback.
- **Data freshness:** Enriched data degrades as shops change menus, hours, or close. Check-in menu photos partially automate refresh, but periodic manual verification is an ongoing maintenance task.
- **Railway vs serverless:** Railway runs as persistent services (not serverless functions), which means no cold starts and no timeout limits on long-running enrichment jobs — a deliberate choice for the data pipeline.
- **Solo dev timeline:** 2-4 weeks is aggressive. The 30-shop data enrichment + semantic search prototype (week 0) must prove the wedge before investing in full build.

---

## 9. Business Rules

> This section is checked by every /brainstorming session before designing a feature. Keep it current. Any rule that shapes how the system behaves goes here.

- **Auth wall:** Unauthenticated users can browse directory (list view, map view, shop detail, filters) but cannot access semantic search, user lists, check-ins, or profile.
- **Semantic search is auth-gated:** The chatbox on the landing page is visible to all users but prompts login when submitted without an active session.
- **Lists cap:** A user can have at most 3 lists. Enforced at the API level, not just UI. Exceeding 3 returns a 400 error.
- **Lists are private in V1:** No user can view another user's lists. No shareable list links in V1.
- **Check-in requires photo:** At least one photo upload is mandatory for a check-in to be recorded. Text note is optional. Menu photo is optional.
- **Check-in deduplication:** A user can check in to the same shop multiple times. No deduplication — multiple visits earn multiple stamps (intended collection mechanic).
- **Stamps:** One unique stamp design per shop. Multiple check-ins at the same shop earn duplicate stamps of that design. Stamps are non-transferable and non-purchasable in V1.
- **Profile is private:** The user profile page is only accessible to the authenticated user who owns it. Not publicly viewable in V1.
- **Weekly email:** Fixed schedule. All opted-in users receive the same curated content in V1. No personalization until usage data exists.
- **PDPA data deletion:** Account deletion must cascade all personal data: check-in photos (Supabase Storage), text notes, lists, stamps, profile data. Must complete within 30 days of request. Non-negotiable — must be built before launch.
- **Provider abstraction:** Business logic never imports provider SDKs directly. All external services accessed via interfaces in `lib/providers/`.
- **Taxonomy is canonical:** Filter UI options and LLM enrichment prompts both derive from the taxonomy table. Adding a new tag to the taxonomy automatically makes it available in filters and future enrichment runs.
