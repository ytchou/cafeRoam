# Fail-open exception paths must always capture to Sentry

**Date:** 2026-03-30
**Context:** Scheduler hardening — `acquire_cron_lock` in `workers/queue.py`

**What happened:**
The `acquire_cron_lock` fail-open exception handler caught exceptions silently with no Sentry capture:
```python
except Exception:
    logger.warning("Cron lock acquisition failed, proceeding", job_name=job_name)
    return True
```
The design doc explicitly said "Logged + Sentry" but the Sentry call was missing. The exception was not bound, so the error detail was also absent from the log.

**Root cause:**
Fail-open paths are easily treated as "safe" (the system keeps working), making it tempting to log at `warning` and move on. But fail-open on a *guard mechanism* (idempotency lock) means the guard silently degrades during the exact failure scenario it protects against — a DB outage during a dyno restart storm causes every cron job to fire without writing the lock.

**Prevention:**
1. Every `except Exception:` that silences an error and returns a default must bind the exception: `except Exception as exc:` and call `sentry_sdk.capture_exception(exc)`.
2. Design docs that say "Logged + Sentry" must be read as a checklist, not decoration — verify both are present in the implementation.
3. Fail-open exception paths deserve *more* alerting than fail-closed ones, not less, because their failures are invisible by design.
