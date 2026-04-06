# Plan: Migrate from Local Supabase to Staging-Only Development

## Context

The project maintains two Supabase instances (local Docker + remote staging) that have diverged from manual backfills. For a solo project, this is unnecessary overhead. We're consolidating to staging-only for development. CI keeps its own ephemeral Supabase.

**Data comparison (2026-04-06):** Staging has more shop data (715 vs 711 shops). Local has 7 test lists and 13 profiles not on staging — we'll export those before cutting over.

---

## Step 0: Data Safety — Export local lists/profiles to staging

1. Export local lists + profiles as a seed file:
   ```bash
   docker exec supabase_db_caferoam pg_dump -U postgres -d postgres \
     --data-only -t lists -t list_items -t profiles \
     > supabase/seeds/local_lists_profiles_backup.sql
   ```
2. Push to staging:
   ```bash
   psql "$STAGING_DATABASE_URL" < supabase/seeds/local_lists_profiles_backup.sql
   ```
3. Verify counts match on staging after import.

---

## Step 1: Link Supabase CLI to staging

```bash
supabase link --project-ref qpgshghlgjydzxfdewez
```

Then verify: `supabase db diff` — should show no drift if migrations are in sync.

---

## Step 2: `backend/core/config.py` — Remove localhost default

**File:** `backend/core/config.py:7`

```python
# Before:
supabase_url: str = "http://127.0.0.1:54321"
# After:
supabase_url: str = ""
```

Forces explicit env var — no silent fallback to dead local instance.

---

## Step 3: `scripts/doctor.sh` — Rewrite for staging-first

- **Remove** `check_env_var_localhost` function entirely
- **Remove** Docker health check (no longer required for Supabase)
- **Remove** local Supabase DB/Auth curl checks (`127.0.0.1:54321`)
- **Replace** with: check that `SUPABASE_URL` is set and reachable (curl staging URL)
- **Replace** localhost env checks with "is set and non-empty" checks
- **Keep** "Migrations in sync" check (works against linked remote via `supabase db diff`)
- **Keep** all non-Supabase checks as-is (Docker stays — may be needed for other things)

---

## Step 4: `Makefile` — Adapt targets for staging-first

| Target | Change |
|--------|--------|
| `setup` | Remove `supabase start`. Add `supabase link` hint. Keep `supabase db push`. |
| `restore-seed-user` | Use `$SUPABASE_URL` from env instead of hardcoded `127.0.0.1:54321`. Read keys from `backend/.env`. |
| `seed-shops` | Change from `docker exec` to `psql "$DATABASE_URL"`. Require `DATABASE_URL` env var. |
| `seed-kino` | Same as `seed-shops`. |
| `seed-staging` | **Remove** — now redundant with `seed-shops`. |
| `reset-db` | **Remove entirely** — too dangerous for shared staging. |
| `restore-snapshot` | Update default TARGET from local postgres URL to require explicit `DATABASE_URL`. |
| `help` | Update all descriptions. |

---

## Step 5: `.env.example` — Update comments

- Update `NEXT_PUBLIC_SUPABASE_URL` comment: "Your Supabase project URL (e.g. https://xxx.supabase.co)"
- Add `DATABASE_URL` entry for direct postgres connection (used by seed/migration targets)
- Remove any localhost hints

---

## Step 6: `CLAUDE.md` — Update Database section

Replace current "Database (Supabase)" section with staging-first workflow:
- Remove `supabase start` and Docker references
- Remove `make reset-db`
- Update `make seed-shops` to show `DATABASE_URL=... make seed-shops`
- Add `supabase link` as one-time setup step
- Update Environment Preflight to remove "Supabase is running" language

---

## Step 7: `ERROR-PREVENTION.md` — Update Supabase entries

- Update the "`supabase db reset` Wipes All Live Data" entry: note that `reset-db` has been removed; use snapshots for recovery
- Add: "Never run destructive SQL against staging without `make snapshot-staging` first"

---

## Files Modified

| File | Change |
|------|--------|
| `backend/core/config.py` | Remove localhost default for `supabase_url` |
| `scripts/doctor.sh` | Rewrite Supabase checks for staging connectivity |
| `Makefile` | Adapt seed/setup targets; remove `reset-db` and `seed-staging` |
| `.env.example` | Update comments, add `DATABASE_URL` |
| `CLAUDE.md` | Update Database section for staging-first |
| `ERROR-PREVENTION.md` | Update Supabase safety entries |

## NOT Changing

- **CI workflows** — already don't use local Supabase
- **Frontend/backend client code** (`lib/supabase/`, `backend/db/supabase_client.py`) — already env-driven
- **Seed SQL files** — content unchanged, just how they're applied
- **`supabase/config.toml`** — still needed for migration CLI
- **Tests** — already mock Supabase, no real instance dependency

---

## Verification

1. `make doctor` passes with staging-pointed `.env.local` and `backend/.env`
2. `supabase db diff` shows no drift against staging
3. `pnpm dev` + `cd backend && uvicorn main:app --reload` both connect to staging
4. `pnpm test` passes (1233 tests, mocked)
5. `cd backend && pytest` passes (849+ tests, mocked)
6. `DATABASE_URL=... make seed-shops` works against staging
7. `make restore-seed-user` works against staging
