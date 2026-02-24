# Design: Code Review Fixes — Python Backend Migration

Date: 2026-02-24

## Context

A pre-PR code review of `feat/python-backend-migration` found 21 issues (4 Critical, 11 Important, 6 Minor). This design addresses all Critical and Important issues, plus easy Minor wins. Taxonomy stubs and deployment config are deferred.

**Code Review Verdict:** Needs rework (4 Critical issues)

---

## Group A: Auth/Authorization Architecture (Critical)

### Problem

The Python backend uses a singleton Supabase client initialized with the anon key. This bypasses RLS policies that depend on `auth.uid()`. Combined with missing ownership checks in `lists_service.add_shop()` and `remove_shop()`, any authenticated user can modify any other user's lists.

The design doc (line 211-216) explicitly states: "Supabase RLS policies enforce row-level access." The DB infrastructure design defines RLS policies on `lists` (`auth.uid() = user_id`), `list_items` (parent list ownership subquery), `check_ins`, and `stamps`.

### Approach: Per-Request JWT Supabase Client

Create a per-request Supabase client that carries the user's JWT token. PostgREST uses this token for `auth.uid()` in RLS policies.

**Changes:**

1. **`backend/db/supabase_client.py`**
   - Remove `get_supabase_client()` (anon key singleton)
   - Add `get_user_client(token: str) -> Client` — creates a Supabase client authenticated with the user's JWT
   - Keep `get_service_role_client()` for workers (module-level `_service_client: Client | None` pattern, no `lru_cache`)
   - Add `reset_clients()` for test teardown

2. **`backend/api/deps.py`**
   - Add `get_user_db(request: Request) -> Client` dependency — extracts JWT from Authorization header, calls `get_user_client(token)`
   - Existing `get_current_user` validates the JWT and returns user claims
   - Routes that need both auth + DB get them via separate `Depends()`

3. **All `backend/api/*.py` routes**
   - Replace `db = get_supabase_client()` with `db: Client = Depends(get_user_db)`
   - RLS now enforces ownership automatically — no application-level ownership checks needed for read/delete operations

4. **`backend/services/lists_service.py`**
   - Remove `user_id` parameter from `add_shop()` and `remove_shop()` — RLS handles it via the JWT client
   - Keep `user_id` in `create()` for the INSERT (RLS allows insert with `auth.uid() = user_id`)

5. **`backend/services/checkin_service.py`**
   - Same pattern: RLS enforces ownership on reads, `user_id` passed for inserts

6. **Worker access unchanged** — workers use `get_service_role_client()` which bypasses RLS (correct for job queue, enrichment, etc.)

---

## Group B: Data Integrity (Critical)

### B1: `enriched_at` String Literal

**Problem:** `enrich_shop.py` sets `"enriched_at": "now()"` — a string, not SQL. PostgREST sends it as JSON, resulting in a type error or corrupted data.

**Fix:** Replace with `datetime.now(UTC).isoformat()` in `backend/workers/handlers/enrich_shop.py`.

### B2: Missing Job Retry Logic

**Problem:** `JobQueue.fail()` unconditionally sets `status = FAILED`. The `max_attempts` field and docstring promise retry behavior that doesn't exist.

**Fix:** In `fail()`:
1. Fetch the job's current `attempts` and `max_attempts`
2. If `attempts < max_attempts`: set `status = PENDING`, `scheduled_at = now + 2^attempts * 30 seconds` (exponential backoff)
3. If `attempts >= max_attempts`: set `status = FAILED` (terminal)

---

## Group C: Transaction Safety (Important)

### C1: Check-In Atomicity via DB Trigger

**Problem:** `CheckInService.create()` makes 3 sequential inserts (check-in, stamp, job) with no transaction. Partial failures create orphan records. Also bypasses the `JobQueue` abstraction.

**Approach:** Follow the ADR — create a Postgres `AFTER INSERT` trigger on `check_ins`:

```sql
CREATE OR REPLACE FUNCTION trg_checkin_after_insert()
RETURNS trigger AS $$
BEGIN
  -- Auto-create stamp
  INSERT INTO stamps (user_id, shop_id, check_in_id, stamp_image_url)
  VALUES (NEW.user_id, NEW.shop_id, NEW.id, 'default');

  -- Queue menu photo enrichment if menu photo provided
  IF NEW.menu_photo_url IS NOT NULL THEN
    INSERT INTO job_queue (job_type, payload, status, priority, scheduled_at)
    VALUES (
      'enrich_menu_photo',
      jsonb_build_object('shop_id', NEW.shop_id, 'image_url', NEW.menu_photo_url),
      'pending', 5, now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_after_insert
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION trg_checkin_after_insert();
```

**Service simplification:** `CheckInService.create()` only inserts the check-in row. Remove stamp insert and job queue insert from Python code.

### C2: 3-List Cap via DB Constraint

**Problem:** Count check and insert are separate operations — TOCTOU race allows > 3 lists.

**Approach:** Postgres trigger on `lists` INSERT:

```sql
CREATE OR REPLACE FUNCTION enforce_max_lists_per_user()
RETURNS trigger AS $$
DECLARE
  list_count integer;
BEGIN
  SELECT count(*) INTO list_count
  FROM lists WHERE user_id = NEW.user_id;

  IF list_count >= 3 THEN
    RAISE EXCEPTION 'User has reached the maximum of 3 lists'
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

**Service simplification:** `ListsService.create()` just inserts. Catch `PostgrestAPIError` with `check_violation` code and translate to HTTP 400.

---

## Group D: Frontend Proxy & Infrastructure (Important)

### D1: Missing List Sub-Resource Proxy Routes

Create three new Next.js route files:

- `app/api/lists/[id]/route.ts` — proxy `DELETE` to `DELETE /lists/{id}`
- `app/api/lists/[id]/shops/route.ts` — proxy `POST` to `POST /lists/{id}/shops`
- `app/api/lists/[id]/shops/[shopId]/route.ts` — proxy `DELETE` to `DELETE /lists/{id}/shops/{shopId}`

### D2: Missing Auth Route

Create `backend/api/auth.py` with auth callback handler. Register in `main.py` via `app.include_router(auth_router)`.

### D3: Proxy Content Type Fix

Fix `lib/api/proxy.ts`:
- **Request:** Forward original `Content-Type` from incoming request instead of hard-coding `application/json`
- **Response:** Pass through the backend's response headers (especially `Content-Type`) instead of hard-coding

### D4: Dockerfile Fix

Change `COPY pyproject.toml ./` to `COPY pyproject.toml uv.lock ./` so `uv sync --frozen` can find the lock file.

### D5: Resend Email Adapter Fixes

Two issues in `backend/providers/email/resend_adapter.py`:
- **Sync SDK in async method:** Wrap `resend_sdk.Emails.send()` in `await asyncio.to_thread(...)` to avoid blocking the event loop
- **Global state mutation:** Move `resend_sdk.api_key = api_key` to the `send()` method scope, or pass API key configuration differently

### D6: `Job.payload` Type

Widen from `dict[str, str | int | float | bool | None]` to `dict[str, Any]` in `backend/models/types.py` to support nested payloads.

---

## Group E: Quick Minor Fixes

### E1: `row.pop("similarity")` Mutation

Change `row.pop("similarity", 0.0)` to `row.get("similarity", 0.0)` in `search_service.py`.

### E2: `posthog-python` Dependency

Add `posthog>=3.0` to `pyproject.toml` dependencies.

### E3: Missing Handler Tests

Add tests for `handle_enrich_menu_photo` and `handle_weekly_email` in `backend/tests/workers/test_handlers.py`.

---

## Deferred Items (tracked in TODO.md)

| Item | Reason |
|------|--------|
| `_compute_taxonomy_boost` implementation | Needs tag schema design + taxonomy data model work |
| `enrich_shop` tag persistence | Needs `shop_tags` junction table + design |
| `railway.json` creation | Deployment config, not blocking code review |
| `CLAUDE.md` update | Documentation, low priority |

---

## Verification

After all fixes are implemented:

1. `pytest` passes — all existing + new tests
2. `ruff check .` passes
3. `mypy .` passes
4. `pnpm build` passes (frontend)
5. `pnpm test` passes (frontend proxy route tests)
6. Re-run `/code-review` — expect no Critical issues, at most Minor stubs
