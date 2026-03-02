# Lesson: Cross-Language API Contract Drift

**Date:** 2026-03-02
**PR:** feat/admin-dashboard
**Severity:** 5 Critical bugs caught in review

## What Happened

The admin dashboard was built with the frontend (TypeScript) and backend (Python) developed in parallel. Five critical bugs were caught in code review — all were frontend↔backend API contract mismatches that would cause silent failures at runtime:

1. **Response shape mismatch**: Backend returns `{shop: {...}, tags: [...], photos: [...]}` but frontend read `data.name` (flat) — all values `undefined`
2. **Missing proxy routes**: 3 Next.js API proxy routes missing — endpoints 404 at runtime
3. **Wrong HTTP method**: Frontend sent `PATCH`, proxy only exported `PUT` — always 405
4. **Wrong query param name**: Frontend sent `?q=`, FastAPI expects `?query=` — always 422
5. **Wrong RPC return shape**: Called `row.get("shop_id")` on an RPC that returns `{tag_id, shop_count}` — silently always 0

## Why It Happened

No shared type system between TypeScript and Python. Each side evolved independently. Tests mocked their own side correctly but didn't test the actual contract between them.

The shop detail page test was mocked with a flat response shape — it never caught the nested shape the backend actually returns.

## Prevention Rules

1. **Always test against the real backend contract in integration tests**. If you mock the API response in a frontend test, make sure the mock matches what the backend actually returns — not what you think it returns.
2. **When you write a `fetch()` call, immediately look at the corresponding FastAPI route** to verify: URL, HTTP method, query param names, response shape. These four things diverge silently.
3. **Missing proxy routes = runtime 404**. When adding backend endpoints that need to be called from the frontend, immediately create the proxy route file — don't defer it.
4. **RPC return shapes must be verified**. When calling `db.rpc()` and iterating over the result, explicitly check what fields the RPC actually returns before accessing them.

## Related

- `ERROR-PREVENTION.md` → "Cross-language contract drift" section
- See also: `2026-02-23-inline-types-silently-diverge.md` for the TypeScript-side equivalent
