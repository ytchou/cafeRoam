# Plan: Search Quality for Exact/Specific Terms (DEV-122)

Date: 2026-03-31
Design: [docs/designs/2026-03-31-search-quality-exact-terms-design.md](../designs/2026-03-31-search-quality-exact-terms-design.md)

## Sub-issues

| Ticket  | Title                                           | Size | Wave |
| ------- | ----------------------------------------------- | ---- | ---- |
| DEV-127 | DB migration — menu_highlights + coffee_origins | S    | 1    |
| DEV-128 | NFKC normalizer + tests                         | S    | 1    |
| DEV-129 | search_vocabulary.py baseline                   | S    | 1    |
| DEV-130 | Enrichment tool schema + SYSTEM_PROMPT          | S    | 2    |
| DEV-131 | Classifier rebuild + tests                      | S    | 2    |
| DEV-132 | enrich_shop.py — write new fields               | S    | 2    |
| DEV-134 | SearchService Option C+ scoring + tests         | M    | 3    |
| DEV-135 | Re-enrichment job (runtime, post-merge)         | S    | —    |
| DEV-136 | Coverage verification                           | M    | 4    |

## Execution Waves

### Wave 1 — Foundation (parallel, no file overlap)

**Task 1 (DEV-127): DB migration + model updates**

- Write migration SQL: `ALTER TABLE shops ADD COLUMN menu_highlights text[] DEFAULT '{}', ADD COLUMN coffee_origins text[] DEFAULT '{}';`
- Update `backend/models/types.py`: add `menu_highlights: list[str]` and `coffee_origins: list[str]` to `Shop` and `EnrichmentResult`
- Update `search_shops` RPC migration to include new columns in SELECT
- Files: `supabase/migrations/YYYYMMDD_add_menu_highlights_coffee_origins.sql`, `backend/models/types.py`, `supabase/migrations/YYYYMMDD_update_search_shops_rpc.sql`

**Task 2 (DEV-128): NFKC normalizer + tests**

- Add `unicodedata.normalize("NFKC", text)` to `normalize_query()`
- Write `backend/tests/test_query_normalizer.py` with NFKC, full-width, variant cases
- Files: `backend/services/query_normalizer.py`, `backend/tests/test_query_normalizer.py`

**Task 3 (DEV-129): search_vocabulary.py**

- Create `backend/core/search_vocabulary.py` with `ITEM_TERMS` and `SPECIALTY_TERMS` lists
- Files: `backend/core/search_vocabulary.py`

### Wave 2 — Enrichment + Classifier (parallel, no file overlap)

**Task 4 (DEV-130): Enrichment tool schema + SYSTEM_PROMPT**

- Add `menu_highlights` and `coffee_origins` fields to `CLASSIFY_SHOP_TOOL` schema
- Update `SYSTEM_PROMPT` to mention specific item extraction
- Update `_parse_enrichment()` to extract new fields
- Files: `backend/providers/llm/anthropic_adapter.py`

**Task 5 (DEV-131): Classifier rebuild + tests**

- Replace hardcoded regex with vocabulary-driven compiled regex
- Normalize query before classification
- Write `backend/tests/test_query_classifier.py`
- Files: `backend/services/query_classifier.py`, `backend/tests/test_query_classifier.py`

**Task 6 (DEV-132): enrich_shop.py update**

- Add `menu_highlights` and `coffee_origins` to the DB update call
- Files: `backend/workers/handlers/enrich_shop.py`

### Wave 3 — Search Scoring (sequential)

**Task 7 (DEV-134): SearchService Option C+ scoring + tests**

- Move `classify()` before `service.search()` in `api/search.py`
- Add `query_type` parameter to `SearchService.search()` and `_full_search()`
- Implement `_compute_keyword_score()` method
- Add scoring branch: item_specific/specialty_coffee → 0.5/0.2/0.3; generic → unchanged
- Write tests in `backend/tests/test_search_service.py` (extend existing)
- Files: `backend/api/search.py`, `backend/services/search_service.py`, `backend/tests/test_search_service.py`

### Wave 4 — Verification

**Task 8 (DEV-136): Full suite verification**

- Run pytest + ruff check + ruff format
- Verify search_service.py ≥80% coverage
- Files: none (verification only)

### Post-merge (DEV-135)

- Re-enrichment job for 170 live shops via worker queue
- This is a runtime operation, not a code change
