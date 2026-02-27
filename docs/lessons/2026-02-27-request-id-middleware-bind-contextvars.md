# Request ID middleware must bind to structlog contextvars, not just set response header

**Date:** 2026-02-27
**Context:** `backend/middleware/request_id.py` in the observability feature

**What happened:**
The middleware generated a UUID, set it on the response header (`X-Request-ID`), and logged it in the access log line. But it never called `structlog.contextvars.bind_contextvars(request_id=...)`. Every log statement inside route handlers during the request was missing the `request_id` field. The correlation chain was broken silently — the header was set and visible externally, but the log entries were uncorrelated internally.

**Root cause:**
It's easy to conflate "the header is set" with "logging is correlated". They are separate concerns. The response header is for external callers (API gateways, load balancers). The contextvars binding is for internal log correlation.

**Prevention:**
Request ID middleware must do all three:
1. `structlog.contextvars.bind_contextvars(request_id=request_id)` — before `call_next`
2. `sentry_sdk.set_tag("request_id", request_id)` — before `call_next`
3. `structlog.contextvars.clear_contextvars()` — in a `finally` block after `call_next`
4. `response.headers["X-Request-ID"] = request_id` — after `call_next`
5. Honor incoming header: `request_id = request.headers.get("x-request-id") or str(uuid.uuid4())`

Also note: `clear_contextvars()` in `finally` runs before any code after the `try` block (e.g., the access log line). If you need `request_id` in the access log, log it explicitly as a kwarg in that line, or move the log inside the `try` block before the `finally` clears context.
