# ADR: Async worker for photo classification over inline scraper classification

Date: 2026-03-25

## Decision

Photo classification (MENU/VIBE/SKIP) runs as a separate async worker triggered after scrape persistence, not inline inside `_parse_place()`.

## Context

DEV-18 requires classifying scraped shop photos using Claude Vision. The classification must happen after photos are fetched from Apify. Two placement options existed: inline during scraping, or as a post-processing async worker.

## Alternatives Considered

- **Inline in `_parse_place()`**: classify each photo immediately during scraping before returning `ScrapedShopData`. Rejected: makes each scrape call significantly slower (N Vision API calls per shop), harder to retry on partial failure, and couples two distinct concerns (data fetching vs enrichment).

- **Async post-processing worker (chosen)**: persist unclassified photos first, then enqueue a classification job. Consistent with the existing `enrich_menu_photo.py` pattern already in the codebase.

## Rationale

The project already has an async enrichment worker pattern (`enrich_menu_photo.py`). Following that pattern keeps the architecture consistent, makes classification retriable independently of scraping, and allows one-off re-classification runs without re-scraping.

## Consequences

- Advantage: scrape latency unaffected; classification failures don't block data persistence
- Advantage: one-off re-classification is trivially triggerable (query `WHERE category IS NULL`)
- Advantage: consistent with existing worker architecture
- Disadvantage: photos are briefly unclassified between scrape and worker execution; downstream consumers must handle `category=NULL` gracefully
