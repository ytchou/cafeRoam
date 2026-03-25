# Cap enforcement in workers must query global DB state, not just in-batch state

**Date:** 2026-03-25
**Context:** DEV-18 photo classification worker

**What happened:**
`_enforce_cap` only received the photos classified in the current job run (fetched via `WHERE category IS NULL`). On a re-scrape, if 4 MENU photos were already classified from a previous run and the new run classified 3 more, the cap check only saw the 3 new ones — all 3 passed — pushing the real total to 7 (above the MENU cap of 5).

**Root cause:**
The handler fetched only unclassified rows to process, which is correct for the classification step. But the same filtered set was passed directly to the cap-enforcement function — which needs to know the *global* count, not just the current batch count.

**Fix:**
Before classifying, call `_get_existing_category_counts(db, shop_id)` to query already-classified rows. Pass the result as `remaining_slots = max(0, cap - existing_count)` to `_enforce_cap`. This decouples "what to classify" (NULL rows) from "how many slots remain" (global count).

**Prevention:**
Any cap/quota enforcement in a worker that operates on a subset of rows must query the full global count for that shop/entity before checking the cap. Never infer quotas solely from the rows fetched for processing.
