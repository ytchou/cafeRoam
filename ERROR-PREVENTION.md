# Error Prevention: CafeRoam (啡遊)

Known errors, their symptoms, causes, and fixes. Add an entry every time you hit a non-obvious problem.

**Format:** Symptom → Root cause → Fix → How to prevent

---

## Template

### [Error name / symptom]

**Symptom:** [What you see when this happens]

**Root cause:** [Why it happens]

**Fix:**

```bash
# Commands or steps to fix it
```

**Prevention:** [What to check or do to avoid this in the future]

---

## Cross-Language API Contract Drift (TypeScript ↔ Python)

**Symptom:** Frontend shows `undefined` for all shop fields; API calls return 404, 405, or 422; a count is always 0 even though data exists.

**Root cause:** TypeScript frontend and Python backend developed in parallel without a shared type system. Common divergences: (1) response shape (nested vs flat), (2) missing proxy routes, (3) HTTP method mismatch (PATCH vs PUT), (4) query param name mismatch (`q` vs `query`), (5) wrong RPC return field names.

**Fix:** Match each `fetch()` call against the FastAPI route: verify URL, method, query params, response shape. Create missing proxy routes immediately.

**Prevention:**

- When writing any `fetch()` call, immediately open the corresponding FastAPI route handler and cross-check: URL, HTTP method, query param names, JSON response shape
- Front-end test mocks must match the actual backend response shape — not an assumed shape
- Missing proxy route = 404 at runtime. Create `app/api/admin/X/route.ts` alongside the backend endpoint

---

## Test Mock Path Drift After Module Refactoring

**Symptom:** Tests that patched `api.module_name.settings` suddenly fail (AttributeError or 403) after extracting logic to `api/deps.py`.

**Root cause:** `unittest.mock.patch("api.X.settings")` patches the name where it is **used**, not where it is **defined**. After moving shared dependencies to `deps.py`, `settings` is no longer imported in `api/X.py`.

**Fix:** Update all patch paths from `api.X.settings` → `api.deps.settings`.

**Prevention:**

- After any `deps.py` extraction, grep for `patch("api.<old_module>.settings")` across all test files and update the path
- Prefer `app.dependency_overrides[require_admin] = lambda: {"id": "admin-id"}` over patching settings — it's immune to module path changes

---

## Supabase Migration Out of Sync

**Symptom:** `supabase db push` fails with "migration already applied" or schema drift errors.

**Root cause:** Local migration history is out of sync with what's been applied to the database, usually from running raw SQL in the Supabase dashboard instead of through migrations.

**Fix:**

```bash
supabase db diff           # See what's different
supabase db push           # Re-apply any pending migrations
# If supabase db push still fails with duplicate key errors in supabase_migrations:
# Use psycopg2 (port 54322) to delete the offending tracking rows, then re-run db push.
# See ERROR-PREVENTION entry "supabase db reset wipes live data" below — never use reset to fix this.
```

**Prevention:** Never run schema-changing SQL directly in the Supabase dashboard. Always create a migration file via `supabase migration new [name]` and apply with `supabase db push`.

---

## pgvector Extension Not Available

**Symptom:** `ERROR: type "vector" does not exist` when running migrations locally.

**Root cause:** pgvector extension not enabled in local Supabase instance.

**Fix:**

```sql
-- Add to migration file or run manually once:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Prevention:** Include `CREATE EXTENSION IF NOT EXISTS vector;` as the first migration. The seed script should check for this before inserting embeddings.

---

## RLS Policy Blocking Authenticated Requests

**Symptom:** Authenticated API routes return empty results or 403 errors despite valid session.

**Root cause:** RLS policy missing or incorrectly written for the table being queried. Common mistake: forgetting `auth.uid()` check on user-scoped tables.

**Fix:**

```sql
-- Check existing policies:
SELECT * FROM pg_policies WHERE tablename = '[table_name]';

-- Standard user-scoped read policy:
CREATE POLICY "Users can read own data" ON [table]
  FOR SELECT USING (auth.uid() = user_id);
```

**Prevention:** After every new table migration, immediately write and test RLS policies. Run `supabase db diff` to confirm policies are in migration files, not just applied manually.

---

## PostgreSQL: Cannot Change RPC Return Type via CREATE OR REPLACE

**Symptom:** Migration fails with `ERROR: cannot change return type of existing function` when adding columns to a `RETURNS TABLE(...)` RPC.

**Root cause:** `CREATE OR REPLACE FUNCTION` can only modify the function body — not its signature. Adding or removing columns from `RETURNS TABLE(...)` is a return type change, which PostgreSQL forbids.

**Fix:**

```sql
-- DROP required before changing return type:
DROP FUNCTION IF EXISTS my_rpc_name();
CREATE OR REPLACE FUNCTION my_rpc_name()
RETURNS TABLE (col1 text, col2 bigint, col3 numeric)  -- new signature
...
```

**Prevention:** Whenever you add/remove columns from a `RETURNS TABLE(...)` function in a migration, prefix with `DROP FUNCTION IF EXISTS`. The `IF EXISTS` makes it safe for fresh installs.

---

## PostgREST: Server max_rows Silently Caps Python Row Fetches

**Symptom:** A Python-side count/aggregate that fetches rows from PostgREST returns a suspiciously round number (e.g., exactly 1000). No error is raised — the response is silently truncated.

**Root cause:** PostgREST enforces a server-side `max_rows` ceiling (default 1000) that overrides the client's `.limit()`. You cannot request more rows than the server allows.

**Fix:** Use a Postgres-side aggregate RPC instead of fetching rows to Python:

```sql
CREATE OR REPLACE FUNCTION my_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(DISTINCT shop_id) FROM shop_tags; $$;
```

```python
result = db.rpc("my_count", {}).execute()
count = int(result.data or 0)
```

**Prevention:** Never fetch rows to Python for aggregation (COUNT, SUM, DISTINCT). Use an RPC for any aggregate that might exceed 1000 rows.

---

## RLS UPDATE Policy Missing — PATCH Endpoint Silently Returns 404

**Symptom:** PATCH endpoint appears correct in application logic but always returns 404. No Python exception. Supabase returns `data=[]` with no error.

**Root cause:** Supabase RLS silently blocks UPDATE operations when no matching `FOR UPDATE` policy exists. The application sees empty `data=[]` and treats it as "not found".

**Fix:** Add `CREATE POLICY "check_ins_own_update" ON check_ins FOR UPDATE USING (auth.uid() = user_id);` in the feature's migration.

**Prevention:** When adding any PATCH/PUT/DELETE endpoint, check the RLS migration for a corresponding `FOR UPDATE`/`FOR DELETE` policy before writing application code. Add the policy in the same migration as the feature's schema changes.

---

## Python snake_case → TypeScript Interface Must Match Wire Format

**Symptom:** All fields from an API response render as `undefined` in the UI. No network error. Response JSON is correct when inspected in DevTools.

**Root cause:** Pydantic `model_dump()` outputs snake_case. `fetchWithAuth()` does NOT camelCase-convert responses. TypeScript interface was written in camelCase (JavaScript convention), so all fields are `undefined` at runtime.

**Fix:** Change TypeScript interface fields to snake_case to match the Python Pydantic model. Update all component references.

**Prevention:** TypeScript interfaces for API responses must mirror Python Pydantic model field names (snake_case). camelCase convention applies only to locally-computed state and component props. When writing a new Pydantic model + TypeScript interface pair, write the TS interface immediately after the Python model and verify field names match exactly.

---

## Blocking Event Loop with Supabase SDK in Async Handlers

**Symptom:** FastAPI responses are slow or hang under load; `asyncio.gather` doesn't provide any speedup.

**Root cause:** supabase-py is a synchronous library. Calling it directly in `async def` blocks uvicorn's event loop for the duration of the DB call.

**Fix:**

```python
# Wrap every supabase-py call in asyncio.to_thread
result = await asyncio.to_thread(lambda: db.table("profiles").select("*").eq("id", uid).execute())
```

**Prevention:** Every supabase-py SDK call inside an `async def` must be wrapped in `asyncio.to_thread`. Use `asyncio.gather` to parallelize independent queries.

---

## PostgREST `.single()` Raises on Empty / Multiple Results

**Symptom:** New users get a 500 error when loading their profile page; logs show `APIError` from the supabase-py client.

**Root cause:** PostgREST `.single()` raises `APIError` when the query matches 0 or 2+ rows. New users have no `profiles` row yet.

**Fix:**

```python
# Use .limit(1) for optional rows; handle empty list
rows = db.table("profiles").select("*").eq("id", uid).limit(1).execute().data
profile = rows[0] if rows else {}
```

**Prevention:** Never use `.single()` for rows that may not exist (user preferences, optional profiles, etc.). Use `.limit(1)` and handle the empty list.

---

## asyncio.gather + Mock side_effect List = Order-Dependent Failures

**Symptom:** Backend tests pass individually but fail when gather is introduced; mock returns wrong table data.

**Root cause:** `asyncio.gather` dispatches coroutines concurrently. `side_effect = [table_a, table_b, table_c]` assumes a deterministic call order that no longer holds.

**Fix:**

```python
# Dispatch by argument instead of by call order
table_map = {"profiles": profile_table, "stamps": stamp_table, "check_ins": checkin_table}
mock_db.table.side_effect = lambda name: table_map[name]
```

**Prevention:** Whenever a service uses `asyncio.gather`, use `lambda name: table_map[name]` dispatch in tests instead of a list-based `side_effect`.

---

## Environment Debugging Loops

**Symptom:** Repeated trial-and-error debugging of env vars, Supabase connectivity, migration state, or service availability. Multiple fix-retry cycles before landing on the right configuration.

**Root cause:** Starting environment-dependent work without verifying environment health first. Common triggers: `.env.local` or `backend/.env` missing Supabase URL, `.env` vs `.env.local` confusion, migrations out of sync, staging project not linked.

**Fix:**

```bash
make doctor    # Run preflight check — shows exactly what's wrong and how to fix it
```

**Prevention:** Run `make doctor` at the start of every session before doing any environment-dependent work. The script checks Docker, Supabase, env files, dependencies, and migration state in ~5 seconds.

---

## Stale Worktree Process Squatting a Port

**Symptom:** `pnpm dev:all` (or `uvicorn`) reports "Address already in use" on port 8000. Backend appears to start (health check passes), but API calls return wrong responses — e.g., 401 "Invalid or expired token" on valid JWTs, 500 on public endpoints, or schema errors from an older codebase.

**Root cause:** A uvicorn process from an old git worktree (`caferoam/.worktrees/<branch>/backend/`) keeps running after the worktree is removed or the terminal is closed. The new backend process fails to bind port 8000 and exits silently. All API traffic continues to hit the stale process with stale code, stale config, and potentially a stale DB schema.

**Fix:**

```bash
# Find and kill the stale process
lsof -ti:8000 | xargs kill -9 2>/dev/null
# Then restart the backend
cd backend && uv run uvicorn main:app --reload --port 8000
```

**Prevention:**

- `make dev-all` now automatically clears port 8000 before starting — always use `make dev-all` rather than running uvicorn directly
- When removing a worktree, kill its backend process first: `lsof -ti:8000 | xargs kill -9 2>/dev/null`
- If API calls return unexpected 401s or 500s, run `ps aux | grep uvicorn` to confirm only one backend is running and it's from the correct directory

---

## Destructive Operations on Staging Database

**Symptom:** All shops, check-ins, lists, and user-generated data vanish. `GET /shops/` returns `[]`.

**Root cause:** Running `supabase db reset` or destructive SQL directly against the staging Supabase project. Since we use staging-first development (no local Supabase), all data lives on staging — there is no local copy to fall back on.

**Prevention:**

- **`make reset-db` has been removed.** There is no one-command wipe available.
- **Before any destructive operation**, always snapshot first: `DATABASE_URL=... make snapshot-staging`
- **Never use `supabase db reset` against the linked staging project.** Use targeted seed restores instead.
- If `pnpm db:seed` or any Makefile target fails with "command not found", stop and investigate — do not reach for destructive commands as a fallback.
- The canonical safe alternatives:
  - Restore admin user only → `make restore-seed-user`
  - Restore shop data only → `DATABASE_URL=... make seed-shops`
  - Restore from snapshot → `FILE=... DATABASE_URL=... make restore-snapshot`

## DB Column Name Masked by Mock Test

**Symptom:** Backend API silently returns `null` for a field in production. Unit tests pass. No error is raised. The field appears to work because the mock injects the value directly — the real DB is never queried.

**Root cause:** A plan or design doc specifies a DB column name that doesn't match the actual migration schema. The TDD test mock injects a hardcoded response keyed by the wrong name (e.g., `"diary_note": None`). Because the mock bypasses the query entirely, the test passes even though the SELECT references a non-existent column. The bug reaches production invisibly.

Common trigger: design doc written before the migration, or design doc using a different naming convention from the schema (e.g., API field name `diary_note` ≠ DB column `note`).

**Fix:**

```python
# In the API handler, verify the SELECT string references the actual column name:
# Wrong — column doesn't exist in migration:
.select("..., check_ins(photo_urls, diary_note)")
# Correct — matches migration schema:
.select("..., check_ins(photo_urls, note)")

# In the response transform, map DB column → API field name explicitly:
row["diary_note"] = checkin_data.get("note")  # maps DB column "note" to API field "diary_note"
```

**Prevention:**

- When a plan/design doc specifies a DB column name used in a JOIN select, cross-reference the latest migration file before writing the query or the test mock
- Run `grep -r "column_name" supabase/migrations/` to confirm the column exists before writing tests
- Mock data keys in backend tests must match the DB schema (what the real query returns), not the API response shape

---

### Mocking Internal HTTP Wrapper Instead of System Boundary (Frontend Hooks)

**Symptom:** Hook tests pass locally but would silently fail if the internal wrapper is ever refactored. Code review flags the test as violating the mock-at-boundaries rule.

**Root cause:** `fetchWithAuth` (or any internal fetch wrapper) calls `supabase.auth.getSession()` then `global.fetch`. When a test does `vi.mock('@/lib/api/fetch', ...)`, it mocks the wrapper as a black box — bypassing both the auth token path and the real HTTP boundary. Tests never verify that the hook correctly sends auth headers or handles auth errors.

**Fix:** Mock at the two real boundaries:

```ts
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  }),
}));
const mockFetch = vi.fn();
global.fetch = mockFetch;
mockFetch.mockResolvedValueOnce({ ok: true, json: async () => payload });
```

**Prevention:** Never `vi.mock` a file in `lib/api/` or `lib/hooks/`. Only mock at `global.fetch`, `@/lib/supabase/client`, or external SDK boundaries. _(Recurred in profile-polaroid and favorites-ui-reconstruct.)_

---

### prettier --check Gives False Negative Locally

**Symptom:** `pnpm format:check` exits 0 locally, but CI fails with "Code style issues found in N files. Run Prettier with --write to fix."

**Root cause:** `prettier --check` only reports; it does not write. Intermittent local success occurs when prettier's line-wrapping behavior differs slightly between the locally-resolved version and the pinned CI version.

**Fix:** Run `npx prettier --write .` (or target changed files) before committing. Do not rely on `format:check` as a pre-commit gate.

**Prevention:** Pre-commit flow: `npx prettier --write` (mutate) then `git add`. Never use `format:check` as the sole pre-commit formatter.

_Add entries here as you discover them._
