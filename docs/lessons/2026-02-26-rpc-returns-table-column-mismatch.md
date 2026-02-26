# RPC RETURNS TABLE Column Mismatches Fail Silently
**Date:** 2026-02-26
**Context:** `find_stale_shops` RPC used by smart staleness sweep
**What happened:** The SQL function `RETURNS TABLE (id, name, enriched_at, last_checked_at)` was missing `google_place_id`. The Python handler called `shop.get("google_place_id")` which always returned `None` — silently defeating the smart sweep optimization. No error was raised; the fallback branch (re-enrich everything) ran instead.
**Root cause:** The RPC column list and the Python handler's expected fields were written independently with no shared contract. Python dict `.get()` returns `None` for missing keys, so the mismatch produced incorrect but non-crashing behaviour.
**Prevention:** When writing a handler that reads columns from an RPC result, add a test that checks the handler reads the specific fields it depends on. When adding fields to an RPC handler, also update the SQL RETURNS TABLE definition and vice versa.
