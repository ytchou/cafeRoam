# Plan: DEV-277 + DEV-283 — CSV seed pipeline (admin dashboard + CLI)

## Context

Standardize shop ingestion to a single CSV format (`name`, `google_maps_url`, extra columns ignored). Remove legacy Cafe Nomad and Google Takeout imports — these created `pending_url_check` shops; since we now seed directly to `pending`, the URL check step is also dead code and gets removed. Add admin dashboard controls to seed from CSV and trigger the batch pipeline.

No migration needed — `source='manual'` already in the CHECK constraint.

---

## Branch

```bash
git worktree add -b feat/dev-277-seed-csv /Users/ytchou/Project/caferoam/.worktrees/feat/dev-277-seed-csv
ln -s /Users/ytchou/Project/caferoam/.env.local .worktrees/feat/dev-277-seed-csv/.env.local
ln -s /Users/ytchou/Project/caferoam/backend/.env .worktrees/feat/dev-277-seed-csv/backend/.env
```

---

## Tasks

### 1. Remove legacy import endpoints from `backend/api/admin_shops.py`

Delete the following three endpoint functions (and their imports, if no longer used elsewhere):
- `async def import_google_takeout(...)` — `POST /import/google-takeout`
- `async def import_cafe_nomad(...)` — `POST /import/cafe-nomad`
- `async def check_shop_urls(...)` — `POST /import/check-urls`

Check that `check_urls_for_region` and related imports are not used by any other endpoint after removal.

---

### 2. Add `POST /admin/shops/import/manual-csv` to `backend/api/admin_shops.py`

```python
@router.post("/import/manual-csv", status_code=202)
async def import_manual_csv(
    file: UploadFile,
    user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
```

**Logic:**
1. Read up to 10MB (reject with 413 if exceeded)
2. Decode as UTF-8 text, parse with `csv.DictReader`
3. For each row: extract `name` and `google_maps_url` (strip whitespace, ignore all other columns)
4. Validate URL with `validate_google_maps_url()` from `importers.prefilter` — count `invalid_url` rejections
5. Deduplicate by `google_maps_url` (keep first, count `duplicate_in_file`)
6. Batch-fetch existing `google_maps_url` values from `shops` table (single `.in_()` query)
7. Insert new rows: `source='manual'`, `processing_status='pending'`, `address=''`, `review_count=0`
8. Call `log_admin_action()` for audit trail
9. Return: `{ "imported": N, "skipped_duplicate": N, "invalid_url": N, "duplicate_in_file": N, "total": N }`

**Imports to reuse:**
- `from importers.prefilter import validate_google_maps_url`
- `from db.supabase_client import get_service_role_client`
- Batch dedup pattern from `run_url_import.py` lines 115–121

---

### 3. Add `POST /admin/pipeline/run-batch` to `backend/api/admin.py`

```python
@router.post("/pipeline/run-batch", status_code=202)
async def run_pipeline_batch(
    background_tasks: BackgroundTasks,
    user: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
```

**Logic:**
```python
import contextlib
from scripts.run_pipeline_batch import main as _run_pipeline

async def _run_pipeline_safe() -> None:
    with contextlib.suppress(SystemExit):
        await _run_pipeline(dry_run=False)

background_tasks.add_task(_run_pipeline_safe)
return {"message": "Pipeline batch run queued"}
```

Note: `run_pipeline_batch.main()` calls `sys.exit(1)` on errors — the `contextlib.suppress(SystemExit)` prevents this from killing the FastAPI worker.

---

### 4. Delete legacy Next.js proxy routes

Delete these files entirely:
- `app/api/admin/shops/import/google-takeout/route.ts`
- `app/api/admin/shops/import/cafe-nomad/route.ts`
- `app/api/admin/shops/import/check-urls/route.ts`

---

### 5. Create new Next.js proxy routes

**`app/api/admin/shops/import/manual-csv/route.ts`**

Follow `google-takeout` pattern exactly: buffer body → 10MB check → forward to backend with Authorization header. Import `BACKEND_URL` from `@/lib/api/proxy`.

**`app/api/admin/pipeline/run-batch/route.ts`**

Simple proxy using `proxyToBackend(request, '/admin/pipeline/run-batch')`.

---

### 6. Rewrite `ImportSection.tsx`

File: `app/(admin)/admin/shops/_components/ImportSection.tsx`

**Remove:** Cafe Nomad section, Google Takeout section, URL Check section (all loading states, refs, handlers).

**Replace with two sections:**

**(a) Manual CSV Seed:**
- `<input type="file" accept=".csv" />` with ref
- "Seed Shops" button (loading state while uploading)
- After success: show summary card — Imported / Skipped (duplicate) / Invalid URL / Total

**(b) Run Pipeline:**
- "Run Pipeline" button — POSTs to `/api/admin/pipeline/run-batch`
- Shows success toast: "Pipeline batch run queued — shops will process in the background"
- No result data (202 fire-and-forget)

Keep `useAdminAuth()` hook and toast pattern from existing code.

---

### 7. CLI scripts (terminal fallback)

**`backend/scripts/filter_shops_csv.py`**

CLI: `uv run python scripts/filter_shops_csv.py <input.csv> [--output cleaned.csv]`
- Read CSV via `csv.DictReader` — use `name` + `google_maps_url`, ignore extra columns
- Validate with `validate_google_maps_url()` from `importers.prefilter`
- Dedup by `google_maps_url` (keep first, strip whitespace)
- Write cleaned CSV (only `name`, `google_maps_url` columns)
- Print: total, valid, invalid_url, duplicates_removed

**`backend/scripts/seed_shops_csv.py`**

CLI: `uv run python scripts/seed_shops_csv.py <cleaned.csv>`
- Read CSV via `csv.DictReader`
- Batch-fetch existing `google_maps_url` (`.in_()` pattern from `run_url_import.py:115-121`)
- Insert: `source='manual'`, `processing_status='pending'`, `address=''`, `review_count=0`
- Skip rows where URL already in DB
- Print: inserted, skipped, total

---

## Critical Files

| File | Action |
|------|--------|
| `backend/api/admin_shops.py` | **Modify** — remove 3 endpoints, add manual-csv endpoint |
| `backend/api/admin.py` | **Modify** — add run-batch endpoint |
| `app/(admin)/admin/shops/_components/ImportSection.tsx` | **Rewrite** — remove legacy, add CSV seed + run pipeline |
| `app/api/admin/shops/import/manual-csv/route.ts` | **Create** |
| `app/api/admin/pipeline/run-batch/route.ts` | **Create** |
| `app/api/admin/shops/import/google-takeout/route.ts` | **Delete** |
| `app/api/admin/shops/import/cafe-nomad/route.ts` | **Delete** |
| `app/api/admin/shops/import/check-urls/route.ts` | **Delete** |
| `backend/scripts/filter_shops_csv.py` | **Create** |
| `backend/scripts/seed_shops_csv.py` | **Create** |

**Do NOT delete** `backend/importers/google_takeout.py`, `backend/importers/cafe_nomad.py`, or `backend/workers/handlers/check_urls.py` — verify no other usages exist before touching.

---

## Testing Classification

- **New e2e journey?** No — admin-only feature.
- **Coverage gate impact?** No — no critical-path service touched.

Manual verification via admin dashboard.

---

## Verification

1. Upload CSV via `/admin/shops` → ImportSection → see correct summary
2. Upload same CSV again → all rows show as skipped (idempotent)
3. DB query: `SELECT processing_status, source, COUNT(*) FROM shops GROUP BY 1, 2` — new rows have `pending` + `manual`
4. Click "Run Pipeline" → toast appears, pipeline runs in background
5. After pipeline: `SELECT processing_status, COUNT(*) FROM shops WHERE source='manual' GROUP BY 1` — shops move to `live` or `out_of_region`
6. Existing shops unchanged: `SELECT COUNT(*) FROM shops WHERE processing_status='live' AND source != 'manual'` matches pre-run count
7. Legacy endpoints return 404: `POST /api/admin/shops/import/google-takeout`, `/cafe-nomad`, `/check-urls`
