# UPDATE .data empty vs .single() APIError — different "no row" behaviors

**Date:** 2026-03-26
**Context:** approve_submission N+1 fix — replaced a second SELECT with `.select("name")` chained on the shop UPDATE

**What happened:**
Fixed an N+1 by chaining `.select("name")` on the shop UPDATE to get the shop name in the same round-trip. Then used `first()` on `shop_update.data`, which raises `RuntimeError` on empty list. If the shop is deleted between the submission SELECT and the shop UPDATE, PostgREST returns `data=[]` silently — causing an unhandled 500.

**Root cause:**
Two different "no row found" patterns:

- `.single().execute()` → raises `APIError` if no row matched (catchable, surfaced as 404/500)
- `.update().select().execute()` → returns `data=[]` silently if no row matched (must check manually)

Using `first()` — which raises on empty — was appropriate for selects but not for update results where empty data is a valid business edge case.

**Prevention:**
When reading data from an UPDATE result (`.update().select().execute()`), always guard against empty `data` explicitly before indexing. Never use `first()` on update `.data` — use `rows[0].get(...)` with a falsy check:

```python
rows = cast("list[dict]", update_result.data or [])
value = rows[0].get("field", "fallback") if rows else "fallback"
```

Reserve `first()` for SELECT queries where an empty result is a programming error.
