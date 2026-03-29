# Design: Bootstrap Supabase Staging Project (DEV-71)

> Date: 2026-03-29
> Hat: CTO
> Status: Approved
> Blocks: DEV-72 (migration parity validation), DEV-73 (Railway staging deploy)

---

## Goal

Create the Supabase staging project (`caferoam-staging`) and verify the full local migration history (78 migrations) applies cleanly to a fresh cloud instance. Set up Storage buckets, Auth, seed data, and wire credentials to Railway via CLI.

## Decisions

- **Region:** Tokyo (ap-northeast-1) — ~20ms to Taiwan vs ~40ms for Singapore. SPEC.md updated.
- **Scope:** Full Supabase setup (DB + Storage + Auth), not just schema.
- **Seed data:** Full 164-shop dataset for realistic testing.
- **Secrets:** Railway CLI (primary) + 1Password (backup).
- **Naming:** `caferoam-staging` (production will be `caferoam-production`).

## Architecture

Single Supabase cloud project in Tokyo hosting:
- Postgres 15 + pgvector (78 migrations, HNSW indexes)
- 4 Storage buckets (checkin-photos, menu-photos, avatars, claim-proofs) with RLS
- Auth (email provider, staging redirect URLs)

Railway staging services connect to this project via env vars set through Railway CLI.

## Phases

### Phase 1 — Project Creation (manual, Supabase dashboard)

1. Create project `caferoam-staging` in Tokyo region
2. Set a strong DB password (store in 1Password immediately)
3. Note: project ref, anon key, service role key, JWT secret
4. Verify pgvector availability (may need `CREATE EXTENSION IF NOT EXISTS vector;`)

### Phase 2 — Railway CLI Setup

1. Install Railway CLI: `brew install railway` or `npm i -g @railway/cli`
2. Authenticate: `railway login`
3. Link to CafeRoam Railway project

### Phase 3 — Migration Push

1. Link Supabase CLI: `supabase link --project-ref <ref>`
2. Push migrations: `supabase db push`
3. Verify: all tables, RLS policies, triggers, HNSW indexes, RPCs, Storage buckets

### Phase 4 — Seed Data

1. Connect to staging DB via `psql` or Supabase SQL Editor
2. Run `supabase/seeds/shops_data.sql` (164 shops)
3. Create staging admin user (equivalent of `make restore-seed-user`)

### Phase 5 — Auth Configuration

1. Enable email auth provider
2. Set Site URL → Railway staging domain
3. Add redirect URLs for staging
4. Disable email confirmations for easier testing

### Phase 6 — Secrets Wiring

Railway env vars to set (via `railway variables set`):

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `DATABASE_URL` | Supabase direct DB connection string |
| `SUPABASE_DB_URL` | Same as DATABASE_URL (used by some services) |

Plus existing non-Supabase vars (OpenAI, Claude, Resend, PostHog, Sentry, Mapbox) — those come from DEV-73 scope.

Backup: Store full credential set in 1Password vault.

### Phase 7 — Verification Checklist

- [ ] All 78 migrations applied without errors
- [ ] Table count matches local
- [ ] RLS policy count matches local
- [ ] HNSW indexes present on embedding columns
- [ ] 4 Storage buckets exist (checkin-photos, menu-photos, avatars, claim-proofs)
- [ ] Storage RLS policies active
- [ ] Auth endpoint responds at `<project-url>/auth/v1/`
- [ ] 164 shops queryable via SQL
- [ ] Seed admin user can authenticate
- [ ] Railway env vars set and accessible

## Error Handling

- **Migration failure:** `supabase db push` is transactional per migration. Fix failing migration locally, re-push.
- **pgvector unavailable:** Enable via SQL editor before push: `CREATE EXTENSION IF NOT EXISTS vector;`
- **Storage bucket migration failure:** Cloud Supabase may not support `INSERT INTO storage.buckets` in migrations. Create buckets manually via dashboard if needed.

## Testing Classification

- [x] No — no new critical user path introduced (infra only)
- [x] No — no critical-path service touched (infra only)

## SPEC Update

`SPEC.md §5` data residency updated from `ap-southeast-1 (Singapore)` to `ap-northeast-1 (Tokyo)` — lower latency to Taiwan.
