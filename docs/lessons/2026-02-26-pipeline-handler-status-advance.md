# Pipeline Handler Must Advance Status Before Queuing Next Step

**Date:** 2026-02-26
**Context:** SCRAPE → ENRICH → EMBED → PUBLISH job chain
**What happened:** `enrich_shop.py` wrote enrichment results to the DB but never set `processing_status = "embedding"`. `generate_embedding.py` stored the vector but never set `processing_status = "publishing"`. Only `scrape_shop.py` and `publish_shop.py` advanced the state machine correctly. Admin and monitoring dashboards showed shops stuck in `"enriching"` forever.
**Root cause:** Each handler was written to focus on its own task (run LLM, store tags, etc.) and enqueue the next job — the status advance for the _next_ stage felt like "the next handler's job", so it fell through the gap.
**Prevention:** Each handler that enqueues a follow-up job owns two responsibilities: (1) do its own work, (2) advance `processing_status` to the _next_ stage name before enqueuing. The status update and the `queue.enqueue` call should appear together. Write an assertion in the handler's test that the DB update includes the expected `processing_status` value.
