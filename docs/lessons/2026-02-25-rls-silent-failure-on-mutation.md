# RLS-Blocked Mutations Return Success Silently
**Date:** 2026-02-25
**Context:** Migrating ListsService ownership checks from application code to Supabase RLS

## What happened
When a user tried to delete a list they didn't own, the new RLS-backed `delete()` returned
`{"ok": True}` with HTTP 200 — the operation silently affected 0 rows.

The old code raised `ValueError` explicitly. The new code trusted RLS, but PostgREST returns
an empty data array (not an error) when RLS filters out all rows from a DELETE.

## Root cause
Mismatched mental models between application-level auth (explicit raises) and database-level
RLS (silent row filtering). When migrating from one to the other, every mutation path that
previously had an explicit ownership check needs a result-count check added.

## Prevention
After any service method that relies on RLS for ownership enforcement:
- For DELETE/UPDATE: check `response.data` — raise `ValueError` if empty
- Add a test that mocks `data=[]` and asserts the ValueError is raised
- Pattern: `if not response.data: raise ValueError("Not found or access denied")`
