# Mocked Supabase client can mask broken PostgREST column references

**Date:** 2026-03-24
**Context:** Profile UI Reconstruct — shop_photo_url implementation in checkin_service.py

**What happened:** The query `.select("*, shops(name, mrt, photo_urls)")` referenced a non-existent column `photo_urls` directly on the `shops` table. Shop photos live in a separate `shop_photos` join table. All backend tests passed because the Supabase client was mocked — the mock returned whatever dict the test provided, including a `photo_urls` key that doesn't exist in the real schema. In production, PostgREST silently returns null for unknown columns, so `shop_photo_url` would have been `None` for every user.

**Root cause:** The bug was introduced at the plan stage (the plan doc itself showed the wrong query), then propagated unchanged to the implementation. The mock-based tests couldn't catch it because they bypass PostgREST schema validation entirely.

**Prevention:**

1. Before writing a new Supabase relational query, check an existing working query in the same codebase for the correct join traversal pattern (`lists_service.py` had `shops(shop_photos(url))` — the correct form).
2. When adding a new `select()` with a join to a table you haven't queried before, verify the column/relation name against the migration files in `supabase/migrations/` before writing the test mock.
3. Plan docs that contain SQL/PostgREST snippets should be cross-checked against the schema — they can be wrong.
