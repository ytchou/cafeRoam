# Service layer must not raise HTTPException

**Date:** 2026-03-17
**Context:** vibe-tags feature — `VibeService._fetch_vibe` raised `fastapi.HTTPException` directly

**What happened:** `VibeService` imported and raised `HTTPException(status_code=404)` when a vibe slug was not found. Every other service (`lists_service`, `checkin_service`, `profile_service`) uses `ValueError`/`RuntimeError` and lets the API route translate those into HTTP responses.

**Root cause:** Copy-paste from an API route handler (where HTTPException is correct) into a service method without noticing the layer boundary violation.

**Prevention:** Service layer raises domain exceptions (`ValueError`, `RuntimeError`, or a custom `XNotFoundError`). API routes (in `backend/api/`) are the only place that raise `HTTPException`. If you see `from fastapi import HTTPException` in a `services/` file, it's wrong — move the raise to the route handler.
