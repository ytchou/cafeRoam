# CLAUDE.md — CafeRoam (啡遊)

## What You're Building

**CafeRoam (啡遊)** is a mobile-first web directory for Taiwan's independent coffee shop scene, powered by AI semantic search and multi-mode discovery (work/rest/social), designed to become the go-to shareable Threads link when someone asks "where should I go?"

**For complete product specifications:** See [PRD.md](PRD.md) and [SPEC.md](SPEC.md)

---

## Tech Stack Quick Reference

- **Framework:** Next.js 15 (App Router), TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (Postgres 15 + pgvector)
- **Auth:** Supabase Auth (JWT sessions)
- **Hosting:** Railway (Next.js app + background workers)
- **Storage:** Supabase Storage (check-in photos, menu photos)
- **Maps:** Mapbox GL JS (via IMapsProvider abstraction)
- **Testing:** Vitest + Testing Library
- **Key integrations:** Claude Haiku (enrichment), OpenAI text-embedding-3-small (vectors), Resend (email), PostHog (analytics), Sentry (errors)

**Full technical architecture:** [SPEC.md](SPEC.md)

---

## Project Structure

```
caferoam/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml        # Lint, format, type-check, tests
│       ├── coverage-check.yml    # Per-file coverage thresholds
│       ├── security.yml          # TruffleHog + Semgrep + pnpm audit
│       └── sql-lint.yml          # Supabase migration linting
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth-gated routes (search, profile, lists)
│   ├── (public)/                 # Public routes (directory, shop detail, landing)
│   └── api/                      # API route handlers
├── components/                   # React components
├── lib/
│   ├── providers/                # Provider abstraction layer
│   │   ├── llm/                  # ILLMProvider (Claude Haiku default)
│   │   ├── embeddings/           # IEmbeddingsProvider (OpenAI default)
│   │   ├── email/                # IEmailProvider (Resend default)
│   │   ├── maps/                 # IMapsProvider (Mapbox default)
│   │   └── analytics/            # IAnalyticsProvider (PostHog default)
│   └── services/                 # Business logic services
├── workers/                      # Railway background workers
│   ├── enrichment/               # Apify trigger + Claude Haiku enrichment
│   ├── embeddings/               # Embedding generation + refresh
│   └── email/                    # Weekly email cron worker
├── supabase/
│   └── migrations/               # SQL migrations (Supabase CLI)
├── scripts/
│   ├── ci/
│   │   ├── coverage-check.py
│   │   └── coverage-rules.json
│   └── setup.sh
├── docs/
│   ├── decisions/                # Architecture decision records (ADRs)
│   ├── designs/                  # Feature design docs (from /brainstorming)
│   ├── plans/                    # Implementation plans (from /writing-plans)
│   ├── lessons/                  # Session learnings (YYYY-MM-DD dated)
│   ├── strategy/                 # competitor-analysis.md, pricing model
│   ├── marketing/                # Brand, positioning, campaigns
│   ├── progress-reviews/         # Milestone reviews
│   └── archive/                  # Superseded documents
├── PRD.md
├── SPEC.md
├── ASSUMPTIONS.md
├── DISCOVERY-NOTES.md
├── TODO.md
├── SPEC_CHANGELOG.md
├── PRD_CHANGELOG.md
├── ERROR-PREVENTION.md
├── .env.example
├── Makefile
└── CLAUDE.md
```

---

## Commands

### App (Next.js)
```bash
pnpm install                   # Install dependencies
pnpm dev                       # Dev server :3000
pnpm build                     # Production build
pnpm lint                      # next lint
pnpm format:check              # prettier --check .
pnpm type-check                # tsc --noEmit
pnpm test                      # vitest run
pnpm test:coverage             # vitest run --coverage
```

### Database (Supabase)
```bash
supabase start                 # Start local Supabase (requires Docker)
supabase db diff               # Check migration state BEFORE pushing
supabase db push               # Apply migrations to local
pnpm db:seed                   # Import ~50 Taipei shops from Cafe Nomad API
supabase db reset              # Reset local DB + reseed
```

### Workers
```bash
pnpm workers:enrich            # Run enrichment worker locally
pnpm workers:embed             # Run embedding generation locally
```

**See [ERROR-PREVENTION.md](ERROR-PREVENTION.md)** for common migration errors.

---

## Critical Business Logic

> **For complete specifications:** [SPEC.md](SPEC.md)

1. **Auth wall:** Unauthenticated users get directory + map + shop detail only. Semantic search, lists, and check-ins require login.
2. **Lists cap:** Max 3 lists per user. Enforce at the API level — not just the UI.
3. **Check-in requires photo:** At least one photo upload is mandatory. Text note and menu photo are optional.
4. **Stamps are per-shop:** One stamp design per shop. Multiple check-ins at the same shop earn duplicate stamps (intended collection mechanic).
5. **PDPA cascade on deletion:** Account deletion must cascade all personal data — check-in photos (Supabase Storage), text notes, lists, stamps, profile. Non-negotiable. Build before launch.
6. **Provider abstraction:** Never import provider SDKs in business logic. Always use interfaces from `lib/providers/`.

---

## Coding Standards

### TypeScript / Next.js
- Strict TypeScript — no `any`
- Functional components only, no class components
- Tailwind for all styling — no CSS files
- Server components by default; client components only when needed (event handlers, browser APIs, interactivity)
- All API routes validate input with Zod

### Provider Abstraction
- Define interface first: `lib/providers/[service]/[service].interface.ts`
- Implement adapter: `lib/providers/[service]/[provider].adapter.ts`
- Wire via factory from env var: `lib/providers/[service]/index.ts`
- Never call provider SDK from outside `lib/providers/`

### Database
- Always run `supabase db diff` before `supabase db push`
- RLS policies required on all user-facing tables
- Never store user PII outside Supabase (no logs, no analytics events with email or raw user IDs)

---

## Testing

### Critical Paths Requiring Tests (80%+ coverage)
- `lib/services/search.service.ts` — semantic search + taxonomy boost logic
- `lib/services/checkin.service.ts` — photo upload, stamp generation
- `lib/services/lists.service.ts` — list CRUD, 3-list cap enforcement
- `lib/providers/` — all provider adapters
- `app/api/` — all API route handlers (auth validation, input validation)

### Coverage Requirements
- Critical paths: 80%+ required
- Services: 70%+ recommended
- Overall codebase: 20%+ minimum

---

## CI/CD

### Workflows

| Workflow | File | What it checks | Blocking? |
|----------|------|----------------|-----------|
| CI | `backend-ci.yml` | Lint, format, type check, tests + coverage | Yes |
| Coverage Check | `coverage-check.yml` | Per-file coverage thresholds | Yes |
| Security | `security.yml` | TruffleHog + Semgrep + pnpm audit | No (continue-on-error) |
| SQL Lint | `sql-lint.yml` | Migration syntax (sqlfluff) | No (continue-on-error) |

### Security Scanners

| Scanner | What it checks |
|---------|----------------|
| TruffleHog | Verified secrets in git history |
| Semgrep | SAST — p/javascript p/typescript p/nextjs p/owasp-top-ten p/secrets |
| pnpm audit | Known CVEs in production dependencies |

### Coverage Thresholds
- Critical files: 80% (blocking) — see `scripts/ci/coverage-rules.json`
- Default files: 45% (blocking) — see `scripts/ci/coverage-rules.json`

### Branch Patterns
- CI triggers on push to: `main`, `dev/**`
- PR checks target: `main`

---

## Spec & PRD Governance

- **Single source of truth:** `SPEC.md` (technical), `PRD.md` (product), `ASSUMPTIONS.md` (risks + open bets)
- **All changes logged:** Every `SPEC.md` edit → `SPEC_CHANGELOG.md` entry. Every `PRD.md` edit → `PRD_CHANGELOG.md` entry.
- **Significant decisions:** Also documented in `docs/decisions/` as ADRs.
- **Brainstorming alignment check:** Before designing any feature, read `SPEC.md` (business rules, constraints), `PRD.md` (vision, success metrics), AND `ASSUMPTIONS.md` (active risks). Surface conflicts as soft flags.

**Changelog entry format:** `YYYY-MM-DD | Section changed | What changed | Why`

---

## Workflow

| Task | Skill |
|------|-------|
| Design a new feature | `/brainstorming` |
| Write an implementation plan | `/writing-plans` |
| Execute a plan | `/executing-plans` |
| Review a PR | `/code-review` |
| Fix a bug | `/debug` |
| Small targeted change | `/quick-fix` |
| Security review | `/security-audit` |

---

## Document Navigation

- **[PRD.md](PRD.md)** — Product requirements and vision
- **[SPEC.md](SPEC.md)** — Complete technical specification
- **[ASSUMPTIONS.md](ASSUMPTIONS.md)** — Assumptions and risk register
- **[DISCOVERY-NOTES.md](DISCOVERY-NOTES.md)** — Research scratch pad, rejected ideas
- **[SPEC_CHANGELOG.md](SPEC_CHANGELOG.md)** — Dated log of spec changes
- **[PRD_CHANGELOG.md](PRD_CHANGELOG.md)** — Dated log of PRD changes
- **[TODO.md](TODO.md)** — Roadmap (phases + milestones)
- **[ERROR-PREVENTION.md](ERROR-PREVENTION.md)** — Known errors and solutions
- **[docs/decisions/](docs/decisions/)** — Architecture decision records
- **[docs/strategy/competitor-analysis.md](docs/strategy/competitor-analysis.md)** — Full competitive analysis
- **[docs/marketing/](docs/marketing/)** — Brand, positioning, campaigns

---

## Project-Specific Security

- **Secrets:** Never commit `.env` or `.env.local`. Use `.env.example` for documentation only.
- **PDPA compliance:** Never log or track user PII in analytics events. Use anonymized user IDs only. Account deletion must cascade all personal data.
- **Check-in photos:** Stored in Supabase Storage with RLS. Only the owning user can access their photos. Disclose at check-in time that menu photos may be used for data enrichment.
- **Sensitive context:** Use `PRIVATE_CONTEXT.md` (gitignored) for business-sensitive notes.
- **CI scanning:** `security.yml` runs TruffleHog + Semgrep + pnpm audit on every push. Check GitHub Security tab for SARIF results.
