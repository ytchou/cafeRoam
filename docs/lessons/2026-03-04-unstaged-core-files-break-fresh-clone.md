# Unstaged Core Files Break Fresh Clone But Pass Local Tests

**Date:** 2026-03-04
**Context:** feat/batch-scraping — second code review pass found `models/types.py`, `interface.py`, `scheduler.py` all modified but never staged.

## What Happened

Three files essential to the new `SCRAPE_BATCH` feature existed only in the working tree:
- `backend/models/types.py` — `JobType.SCRAPE_BATCH` enum value
- `backend/providers/scraper/interface.py` — `BatchScrapeInput`, `BatchScrapeResult`, `scrape_batch` protocol
- `backend/workers/scheduler.py` — `handle_scrape_batch` dispatch case

Tests passed locally because pytest runs against the working tree. A fresh `git clone` + `pytest` would fail immediately with `ImportError` on `BatchScrapeInput`. The feature was fully functional locally but dead on any other machine.

## Root Cause

Files were edited during implementation but `git add` was never run on them. The committed files (scrape_batch.py, persist.py, apify_adapter.py) import from these unstaged files, creating an invisible dependency that only breaks at clone time.

## Prevention

- Before committing new files that import cross-module types, run `git status` and verify all files they import from are also staged.
- `git diff main...HEAD -- backend/models/types.py backend/providers/scraper/interface.py` returning no output is a red flag — if new code imports from these files, they must have been modified.
- When adding a new job type, the minimum commit set is: enum definition + protocol update + scheduler dispatch + handler. All four must be staged together.
