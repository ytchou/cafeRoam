# Catch to clean up, then re-raise — never swallow exceptions after cleanup
**Date:** 2026-02-26
**Context:** Data pipeline — review snapshot/restore pattern in `scrape_shop` handler

**What happened:** Added a try/except to restore old shop reviews if the new review INSERT failed. The except block correctly restored old reviews, then `return`-ed early. Because the handler returned normally (no exception), the scheduler marked the SCRAPE job as "completed". The shop was permanently stuck at `processing_status = "enriching"` with no downstream ENRICH job queued and no way to detect or recover the stuck state.

**Root cause:** "Catch, clean up, return" is a natural pattern but wrong when the caller uses exceptions to distinguish success from failure. The scheduler calls `queue.complete()` on normal return and `queue.fail()` on exception — returning early after a failure silently reports success.

**Prevention:** When catching an exception to perform cleanup (snapshot restore, compensating transaction, etc.), always **re-raise** after cleanup unless the cleanup itself constitutes a full recovery. Rule: *catch to clean up, then raise* — never swallow exceptions that represent real failures.

```python
# WRONG — scheduler thinks the job succeeded
except Exception:
    if old_data:
        db.table("...").insert(old_data).execute()
    return  # ← lies to the caller

# CORRECT — scheduler retries the job
except Exception:
    if old_data:
        db.table("...").insert(old_data).execute()
    raise  # ← let the caller know what happened
```
