# CLAUDE.md — CafeRoam (啡遊)

## What You're Building

**CafeRoam (啡遊)** is a mobile-first web directory for Taiwan's independent coffee shop scene, powered by AI semantic search and multi-mode discovery (work/rest/social), designed to become the go-to shareable Threads link when someone asks "where should I go?"

**For complete product specifications:** See [PRD.md](PRD.md) and [SPEC.md](SPEC.md)

---

## Tech Stack Quick Reference

- **Framework:** Next.js 16 (App Router), TypeScript (strict)
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

Critical paths requiring tests:
- `lib/services/search.service.ts` — semantic search + taxonomy boost logic
- `lib/services/checkin.service.ts` — photo upload, stamp generation
- `lib/services/lists.service.ts` — list CRUD, 3-list cap enforcement
- `lib/providers/` — all provider adapters
- `app/api/` — all API route handlers (auth validation, input validation)

---

## Spec & PRD Governance

- **Single source of truth:** `SPEC.md` (technical), `PRD.md` (product), `ASSUMPTIONS.md` (risks + open bets)
- **All changes logged:** Every `SPEC.md` edit → `SPEC_CHANGELOG.md` entry. Every `PRD.md` edit → `PRD_CHANGELOG.md` entry.
- **Significant decisions:** Also documented in `docs/decisions/` as ADRs.
- **Brainstorming alignment check:** Before designing any feature, read `SPEC.md` (business rules, constraints), `PRD.md` (vision, success metrics), AND `ASSUMPTIONS.md` (active risks). Surface conflicts as soft flags.

**Changelog entry format:** `YYYY-MM-DD | Section changed | What changed | Why`

---

## Project-Specific Security

- **Secrets:** Never commit `.env` or `.env.local`. Use `.env.example` for documentation only.
- **PDPA compliance:** Never log or track user PII in analytics events. Use anonymized user IDs only. Account deletion must cascade all personal data.
- **Check-in photos:** Stored in Supabase Storage with RLS. Only the owning user can access their photos. Disclose at check-in time that menu photos may be used for data enrichment.
- **Sensitive context:** Use `PRIVATE_CONTEXT.md` (gitignored) for business-sensitive notes.
- **CI scanning:** `security.yml` runs TruffleHog + Semgrep + pnpm audit on every push. Check GitHub Security tab for SARIF results.
