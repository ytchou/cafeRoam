# Sync I/O in async functions blocks the FastAPI event loop

**Date:** 2026-03-24
**Context:** feat/search-observability — fire-and-forget observability wiring in search endpoint

**What happened:**
`_log_search_event` and `_track_search_analytics` were declared `async` but contained
only synchronous I/O (Supabase `.execute()` and PostHog `analytics.track()`). When
scheduled via `asyncio.create_task()`, these coroutines ran to completion on the event
loop without ever yielding — blocking all concurrent requests for the duration of the
network calls, defeating the "fire-and-forget" intent entirely.

**Root cause:**
`async def` with no `await` expressions is valid Python but creates a coroutine that
never yields to the event loop. `asyncio.create_task()` schedules it, but when the
loop gets to it the entire body runs synchronously in one shot.

**Prevention:**
When writing fire-and-forget background work in FastAPI:

1. **Use `BackgroundTasks`** (FastAPI-native) for synchronous callables — FastAPI runs
   them after the response is sent, in the same thread (for sync functions).
2. **Use `asyncio.to_thread(sync_fn, ...)`** inside an `async` task if you need the
   background task itself to be async-aware.
3. **Never declare a function `async` unless it contains at least one `await`.**
   A missing `await` is a smell, not a safety net.

**Corollary:** Switching to `BackgroundTasks` also makes tests cleaner — `TestClient`
runs background tasks synchronously, so no manual coroutine collection is needed.
Tests that patch `asyncio.create_task` are a red flag that this antipattern is present.
