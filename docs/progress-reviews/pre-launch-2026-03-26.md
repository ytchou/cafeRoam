# Progress Review: Pre-Launch (Phase 4 Readiness)

**Date:** 2026-03-26
**Section Reviewed:** Phase 3 complete + all Phase 4 feature work to date
**Status:** Phase 3 Complete — Phase 4 in progress (launch prep remaining)
**Previous Review:** 2026-03-14 (pre-Phase-3)

---

## Review Summary: Pre-Launch

### Next Actions (Top 3)

1. **Fix duplicate migration timestamp `20260326000001_*`** — Two migration files share the same timestamp prefix (`add_community_summary_to_search_shops_rpc` + `create_shop_followers`). Supabase applies migrations in lexicographic order; the current ordering is stable, but this violates project convention and will cause confusion in `supabase db diff` output. Rename one file before deploying to production.
2. **Add `ANON_SALT` to `backend/.env.example`** — The config validator raises a warning when `ANON_SALT` equals the dev default, but the variable is absent from `backend/.env.example`. Any new developer or Railway deploy will silently use the insecure default. This is a pre-launch security item.
3. **Activate observability stack on Railway** — Sentry, PostHog, and Better Stack are all code-ready and env-gated, but nothing fires in production until env vars are set in Railway. This must happen before beta traffic starts.

---

## Gap Resolution (since 2026-03-14)

| Previous Gap                                 | Status       | Evidence                                                                       |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| Weekly email content is placeholder          | Still Open   | `weekly_email.py:21` — still `<p>Coming soon...</p>`. In Phase 4 Quality Gate. |
| `slug` field absent from Shop Pydantic model | **Resolved** | PR #40 `fix(backend): add slug field to Shop Pydantic model`                   |
| Railway observability env vars not set       | Still Open   | Phase 4 "Activate Observability Stack" section — all items unchecked           |

---

## What's Complete (since last review)

| Area                                    | Status        | Notes                                                                                |
| --------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| **Phase 3 — Navigation Restructure**    | Complete      | 地圖/探索/收藏/我的 tabs; /map → / permanent redirect                                |
| **Phase 3 — Tarot Surprise Me**         | Complete      | 3-card spread, geo filter, open-now, share card (html2canvas)                        |
| **Phase 3 — Vibe Tags**                 | Complete      | 10 vibe collections, overlap scoring, geo filter, /explore/vibes/[slug] page         |
| **Phase 3 — Community Notes**           | Complete      | Partner review highlights, like/unlike, user_roles join table                        |
| **Phase 3 — UI Reconstruct: Find**      | Complete      | Map/list toggle, MRT station utility, branded coffee cup map pins                    |
| **Phase 3 — UI Reconstruct: Map**       | Complete      | DM Sans + design tokens, all map components rebuilt                                  |
| **Phase 3 — UI Reconstruct: Shop View** | Complete      | Floating overlay, CheckInSheet/Popover/SavePopover/SharePopover                      |
| **Phase 3 — UI Reconstruct: Explore**   | Complete      | Dark espresso tarot theme, desktop Dialog modal, vibe + community pages              |
| **Phase 3 — UI Reconstruct: Favorites** | Complete      | FavoritesListCard, FavoritesMiniMap, desktop sidebar layout                          |
| **Phase 3 — UI Reconstruct: Profile**   | Complete      | PolaroidSection, CorkBoard, /profile/memories cork board page                        |
| **PWA Installability**                  | Code Complete | manifest.ts, icons, metadata wired; 3 manual verifications pending                   |
| **E2E Testing Infrastructure**          | Complete      | Playwright + 10 critical path + 23 stubs; e2e-critical.yml + e2e-nightly.yml         |
| **DEV-6 Menu Items & Search**           | Code Complete | shop_menu_items table, reembed script written; post-deploy dry-run pending           |
| **DEV-7 Check-in Review Embedding**     | Complete      | REEMBED_REVIEWED_SHOPS job, nightly cron, re-embed script                            |
| **DEV-9 Search Observability**          | Complete      | search_events table, query classifier, anonymized PostHog, ANON_SALT                 |
| **DEV-12 Community Feed**               | Complete      | is_public toggle, MRT/vibe_tag filters, auth-gated feed endpoint                     |
| **DEV-14 SEO & GEO (Phase 1)**          | Complete      | sitemap.ts, robots.ts, llms.txt, JSON-LD (CafeOrCoffeeShop + FAQPage + SearchAction) |
| **DEV-16 Analytics Events Audit**       | Complete      | Centralized analytics gateway with PDPA filter; all events routed through backend    |
| **DEV-18 Photo Classification**         | Complete      | CLASSIFY_SHOP_PHOTOS job, Haiku Vision, per-category caps (5 MENU / 10 VIBE)         |
| **DEV-20 Shop Followers**               | Complete      | shop_followers table, FollowerService, FollowButton, profile Following section       |
| **DEV-23 Community Summary Embeddings** | Complete      | SUMMARIZE_REVIEWS job, LLM summarizer, embedding prefers community_summary           |
| **DEV-25 Phase-2 E2E Stubs**            | Complete      | 14 stubs added (J04, J08, J09, J17, J20, J24, J26-J27, J32-J39)                      |
| **DEV-30 GA4 + Cookie Consent**         | Complete      | ConsentProvider, GA4 consent mode v2, PostHog gated on consent                       |
| **DEV-34 Community Summary Display**    | Complete      | CommunitySummary component, snippet in ShopCardCompact, above Reviews in detail      |
| **DEV-36 Semantic Search Cache**        | Complete      | Two-tier cache (hash + pgvector HNSW), provider abstraction, hourly TTL cleanup      |
| **DEV-38 Community Shop Submission**    | Complete      | User URL queue, rate limit (5/day), pending_review gate, admin approval/rejection UI |

---

## Critical Gaps (Product Breaking)

None identified. All critical business rules, auth gates, and data integrity constraints are in place.

---

## Scalability Concerns

| Issue                                               | Impact at Scale                                  | Current State                                                                                                    | Recommendation                                                                       | New/Inherited |
| --------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| Duplicate migration timestamp `20260326000001_*`    | Schema confusion, potential deploy ordering bugs | Two files: `add_community_summary_to_search_shops_rpc` + `create_shop_followers` both prefixed `20260326000001_` | Rename one to `20260326000002_` before production deploy                             | New           |
| IDF taxonomy cache is not async-safe                | Rare data race under high concurrency            | Module-level dict + `time.time()` TTL check                                                                      | Acceptable for beta (<100 concurrent requests); replace with `aiocache` if RPS grows | Inherited     |
| Weekly email sends sequentially per user            | Slow at 10k+ users                               | Loop in `weekly_email.py`, one Resend call per user                                                              | Fine for beta; switch to Resend batch API before public scale                        | Inherited     |
| Search cache hit/miss not exported to observability | Blind spot on cache effectiveness                | Hit count tracked in DB only; no logging/PostHog event                                                           | Add a `search_cache_hit` analytics event or log line for monitoring                  | New           |
| Search results not paginated                        | Memory at 1000+ shops                            | Capped at 50 results                                                                                             | Sufficient for MVP; add cursor pagination at corpus >2000                            | Inherited     |

---

## Spec Alignment Gaps

| Gap                                            | Spec Reference                               | Current State                                                                                        | New/Inherited                         |
| ---------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Weekly email content is placeholder            | SPEC.md §2 "Retention: Weekly curated email" | `weekly_email.py:21` sends `<p>Coming soon...</p>`                                                   | Inherited (Phase 4 Quality Gate item) |
| `ANON_SALT` absent from `backend/.env.example` | SPEC.md §3 Environment Config                | Present in `config.py` with dev-default warning; not documented in `.env.example`                    | New                                   |
| `pg_cron` not enabled in local Supabase        | DEV-36 cache cleanup                         | Migration `20260327000004` safely no-ops if `pg_cron` not enabled; must be enabled before production | New                                   |
| PWA manual verification pending                | PWA plan                                     | 3 items unchecked: DevTools manifest, Lighthouse, iOS/Android install                                | New                                   |

---

## Plan Completion Status

| Plan Doc                                        | Tasks Complete   | Status                                     |
| ----------------------------------------------- | ---------------- | ------------------------------------------ |
| 2026-03-25-photo-classification-plan.md         | All chunks       | Complete                                   |
| 2026-03-25-community-summary-embeddings-plan.md | All chunks       | Complete                                   |
| 2026-03-25-seo-geo-optimization-plan.md         | Phase 1 complete | In Progress (Phase 2+3 are future tickets) |
| 2026-03-25-phase2-e2e-stubs-plan.md             | All chunks       | Complete                                   |
| 2026-03-26-community-summary-display-plan.md    | All chunks       | Complete                                   |
| 2026-03-26-ga4-consent-banner-plan.md           | All chunks       | Complete                                   |
| 2026-03-26-shop-followers-plan.md               | All chunks       | Complete                                   |
| 2026-03-26-community-shop-submission-plan.md    | All chunks       | Complete                                   |
| 2026-03-26-semantic-search-cache-plan.md        | All chunks       | Complete                                   |

All 2026-03-25+ plan docs are complete. No orphaned plan work.

---

## Conflicts Found

| Conflict                    | Expected (Spec)                                | Actual (Code)                | File                   |
| --------------------------- | ---------------------------------------------- | ---------------------------- | ---------------------- |
| `ANON_SALT` documentation   | Should be in `.env.example` as required secret | Missing                      | `backend/.env.example` |
| Migration naming convention | Unique ascending timestamps                    | Two `20260326000001_*` files | `supabase/migrations/` |

---

## Blocking Assessment

| Task                                      | Blocking?                    | Reason                                                                                  | Placement                             |
| ----------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| Fix duplicate migration timestamp         | Yes                          | Potential production deploy confusion; must fix before Railway push                     | Discovered Tasks (P1)                 |
| Add `ANON_SALT` to `backend/.env.example` | Yes (security)               | Any new Railway deploy gets insecure dev default silently                               | Discovered Tasks (P1)                 |
| Activate observability stack (Railway)    | Yes (for beta)               | No Sentry/PostHog data in production until set                                          | Phase 4: Activate Observability Stack |
| Weekly email content                      | No                           | Placeholder sends without error; can iterate on content after beta data                 | Phase 4: Quality Gate                 |
| DEV-6 post-deploy reembed dry-run         | No                           | Script written; post-deploy operational step                                            | Phase 4: Menu Items                   |
| PWA manual verification                   | No                           | Code complete; UX polish only                                                           | Phase 4: PWA                          |
| Beta program recruitment                  | No (gating, not blocking)    | Operational step                                                                        | Phase 4: Beta Program                 |
| Enable `pg_cron` in Railway Supabase      | No (silent no-op without it) | Cache cleanup cron only runs if extension enabled; cache functions correctly without it | Phase 4: Activate Observability Stack |

---

## Recommendations

1. **[P1] Fix duplicate migration timestamp** — Rename `20260326000001_create_shop_followers.sql` → `20260326000002_create_shop_followers.sql` before next `supabase db push` to production.
2. **[P1] Add `ANON_SALT` to `backend/.env.example`** — Add a commented line with a note to generate via `openssl rand -hex 32`. This is security-critical; dev default must never reach production.
3. **[P1] Activate observability on Railway** — Set `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `ANON_SALT` in Railway before beta launch.
4. **[P2] Add cache hit/miss analytics event** — Log or emit a PostHog event on `search_cache_hit=true/false` so search cache effectiveness is visible in PostHog dashboards.
5. **[P2] Enable `pg_cron` in Railway Supabase** — Via Dashboard → Extensions → pg_cron → Enable. Required for hourly cache cleanup to run.
6. **[P3] Weekly email content algorithm** — Design and implement before beta users receive their first email. The infrastructure (scheduler, provider, auth query) is all in place.

---

## TODO.md Updates Made

- Added P1 discovered tasks for migration rename and ANON_SALT documentation
- Added P2 task for cache hit/miss observability
- Marked all recently completed features as verified complete

---

## Key Insights

- **48 commits in 12 days** — The highest velocity period of the project. Phase 3 + 8 Phase 4 features shipped in parallel.
- **Semantic cache architecture** (DEV-36) is elegant: Tier 1 (exact hash) avoids the OpenAI embed call entirely; Tier 2 reuses the generated embedding to check similarity — so embedding cost is only paid once per cache miss, not once per tier.
- **PDPA compliance layered correctly**: DEV-16 analytics gateway enforces PDPA filter at the backend before forwarding to PostHog — user IDs are anonymized via `ANON_SALT` at the service layer, not at the client layer.
- **Community summary pipeline** (DEV-23 → DEV-34) follows a clean data flywheel: user check-in reviews → LLM summarization → embedding input → search improvement → displayed in UI. Each step adds value independently.
- **Photo classification cap logic** (DEV-18) is exemplary batch processing: per-category ID lists tracked, then one batch write per category at the end — O(1) DB writes regardless of photo count.
