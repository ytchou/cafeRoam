# Design: DB Schema Fixes + Code Review Fixes Chunk 1 & 2

Date: 2026-02-25

## Context

The `feat/db-infrastructure` branch has 9 SQL migration files that were written before the Python backend migration (PR #8). Several critical mismatches exist between the DB schema and the Python models. Additionally, Code Review Fixes Chunks 1 (per-request JWT / RLS enforcement) and 2 (service simplification via DB triggers) were deferred pending DB migration work.

This design covers three tightly coupled workstreams:

1. Fix existing DB migrations in-place to match Python models
2. Implement Chunk 1: per-request JWT Supabase client
3. Implement Chunk 2: service simplification with DB triggers + RLS

**Approach:** Single branch from `main`. Fix migrations in-place (they've never been applied to production), then implement Chunks 1 + 2. One PR.

**Prior designs referenced:**

- `docs/designs/2026-02-24-db-infrastructure-design.md`
- `docs/designs/2026-02-24-code-review-fixes-design.md`
- `docs/plans/2026-02-24-code-review-fixes-plan.md`

---

## Workstream 1: Migration Fixes (In-Place)

### Migration 5 (`_create_job_queue.sql`) — 4 changes

**1a. Column renames to match Python `Job` model:**

- `error TEXT` -> `last_error TEXT`
- `locked_at TIMESTAMPTZ` -> `claimed_at TIMESTAMPTZ`

**1b. Status CHECK constraint update:**

```sql
-- OLD
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter'))
-- NEW
CHECK (status IN ('pending', 'claimed', 'completed', 'failed', 'dead_letter'))
```

`processing` -> `claimed` to match Python's `JobStatus.CLAIMED`. Keep `dead_letter` in DB and add it to the Python `JobStatus` enum.

**1c. Replace check-in trigger — combined AFTER INSERT:**

Drop the existing `queue_menu_photo_enrichment()` function and `trg_checkin_menu_photo` trigger. Replace with a single combined trigger:

```sql
CREATE OR REPLACE FUNCTION handle_checkin_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create stamp
  INSERT INTO stamps (user_id, shop_id, check_in_id, design_url, earned_at)
  VALUES (NEW.user_id, NEW.shop_id, NEW.id, '/stamps/' || NEW.shop_id || '.svg', now());

  -- Queue menu photo enrichment if photo provided
  IF NEW.menu_photo_url IS NOT NULL THEN
    INSERT INTO job_queue (job_type, payload, priority)
    VALUES (
      'enrich_menu_photo',
      jsonb_build_object('shop_id', NEW.shop_id, 'image_url', NEW.menu_photo_url),
      5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checkin_after_insert
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION handle_checkin_after_insert();
```

**1d. Add list cap trigger — BEFORE INSERT on `lists`:**

```sql
CREATE OR REPLACE FUNCTION enforce_max_lists_per_user()
RETURNS TRIGGER AS $$
DECLARE
  list_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO list_count
  FROM lists WHERE user_id = NEW.user_id;

  IF list_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 lists allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_max_lists
  BEFORE INSERT ON lists
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_lists_per_user();
```

### Migration 9 (`_create_claim_job_rpc.sql`) — Rewrite

```sql
CREATE OR REPLACE FUNCTION claim_job(p_job_type TEXT DEFAULT NULL)
RETURNS SETOF job_queue AS $$
  UPDATE job_queue
  SET status = 'claimed',
      claimed_at = now(),
      attempts = attempts + 1
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (p_job_type IS NULL OR job_type = p_job_type)
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
```

### Python model fix

Add `DEAD_LETTER = "dead_letter"` to the `JobStatus` enum in `backend/models/`.

---

## Workstream 2: Chunk 1 — Per-Request JWT Supabase Client

### Problem

The Python backend uses a singleton anon-key Supabase client. RLS policies based on `auth.uid()` never fire because the client isn't authenticated with the user's JWT.

### Changes

**`backend/db/supabase.py` — Refactor client creation:**

- `get_service_role_client() -> Client` — singleton, uses `SUPABASE_SERVICE_ROLE_KEY`. Workers and admin only.
- `get_user_client(token: str) -> Client` — per-request, authenticated with user's JWT. Makes `auth.uid()` available in RLS.

**`backend/api/deps.py` — New dependency:**

- `get_user_db(request: Request) -> Client` — extracts Bearer token from `Authorization` header, calls `get_user_client(token)`. Raises 401 if missing/invalid.
- `get_current_user()` remains for user info extraction.

**All API routes wired to `Depends(get_user_db)`:**

- `shops.py`, `search.py` — user client for reads (public SELECT works via RLS anyway)
- `checkins.py` — user client for create/read (RLS enforces `auth.uid() = user_id`)
- `lists.py` — user client for all CRUD (RLS enforces ownership)
- `stamps.py` — user client for reads

**Workers stay on service role client:**

- `backend/workers/queue.py` — `get_service_role_client()` (bypasses RLS)
- All handler files — same

---

## Workstream 3: Chunk 2 — Service Simplification

### `CheckInService.create()` — Single insert

Before:

1. Insert check_in row
2. Insert stamp row
3. Enqueue enrich_menu_photo job

After:

1. Insert check_in row (trigger handles stamp + job)

Photo validation (>= 1 photo URL) remains at application level.

### `ListsService.create()` — Trigger-backed cap

Before:

1. COUNT(\*) lists WHERE user_id = X
2. If count >= 3, raise error
3. INSERT list

After:

1. INSERT list
2. Catch `check_violation` -> raise HTTP 400 "Maximum of 3 lists allowed"

### `ListsService.add_shop()` / `remove_shop()` — Remove user_id param

Before: `add_shop(self, list_id, shop_id, user_id)` with manual ownership check.
After: `add_shop(self, list_id, shop_id)` — RLS enforces ownership. 0 rows affected -> HTTP 404.

### Error handling pattern

- RLS violations return 0 rows (not an error) -> map to HTTP 404
- Trigger violations raise PostgreSQL exceptions -> catch and map to HTTP 400
- Services wrap Supabase calls in try/except for `PostgrestAPIError`

### What does NOT change

- `SearchService` — no simplification needed
- `CheckInService` photo validation — still required at application level
- API route request body shapes — unchanged

---

## Verification

1. **Migration validation:**
   - `supabase db reset` — all migrations apply cleanly
   - Verify triggers: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'check_ins'::regclass`
   - Test `claim_job` RPC: insert pending job, call RPC, verify `status = 'claimed'`

2. **Backend tests:**
   - `cd backend && pytest` — all existing + new tests pass
   - New tests: user client creation, check-in trigger stamps, list cap trigger, simplified service signatures
   - `pytest --cov` — coverage holds or improves

3. **Linting & types:**
   - `ruff check .` passes
   - `mypy .` passes

4. **Frontend:**
   - `pnpm build` — no breakage
   - `pnpm test` — proxy tests pass

5. **Code review re-run:**
   - Run `/code-review` — Chunk 1 + 2 issues resolved
