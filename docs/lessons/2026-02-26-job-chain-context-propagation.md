# Job Chain Context Drops Silently at the First Handler
**Date:** 2026-02-26
**Context:** Data pipeline SCRAPE → ENRICH → EMBED → PUBLISH job chain
**What happened:** `submitted_by` was passed into SCRAPE_SHOP by the submissions API, but `scrape_shop.py` never extracted it from the payload. The downstream handlers (`enrich_shop.py`, `generate_embedding.py`) were written defensively with `if payload.get("submitted_by")`, but since the value was never forwarded at the first hop, the feed event in PUBLISH_SHOP always had `actor_id=None`.
**Root cause:** The first handler in the chain was written to focus on its own work (scraping) and neglected to thread through context fields it didn't use itself. No test asserted the downstream payload shape.
**Prevention:** For every handler that enqueues a follow-up job, write an explicit test asserting that `submitted_by` (and other correlation IDs) appear in the enqueued payload — not just that `queue.enqueue` was called.
