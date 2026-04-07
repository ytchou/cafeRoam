# Pipeline gap: shops without photos bypass enrichment when enqueue point moves

**Date:** 2026-04-07
**Context:** DEV-282 search quality improvements — moved ENRICH_SHOP enqueue from persist.py to classify_shop_photos.py to enforce scrape→classify→enrich ordering.

**What happened:** Removing the ENRICH_SHOP enqueue from persist_scraped_data and relying solely on the classify→enrich chain silently dropped all shops with zero photos. They were persisted but never enriched, never embedded, stuck in "enriching" status forever.

**Root cause:** The classify handler short-circuits when there are no unclassified photos. Any pipeline restructuring that moves a downstream trigger into a conditional path creates a bypass for inputs that don't satisfy the condition.

**Prevention:** When relocating a pipeline trigger (any job enqueue) into a conditional code path, always ask: what happens to inputs that don't enter this branch? Add an explicit fallback for every non-entering case.
