# Code Review Log: ytchou/dev-276-consolidate-scraping-to-batch-only

**Date:** 2026-04-06
**Branch:** ytchou/dev-276-consolidate-scraping-to-batch-only
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (4 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | backend/api/admin_shops.py:451 | `enqueue_job` SCRAPE_BATCH path calls `.single().execute()` to fetch shop's google_maps_url. If shop_id doesn't exist, `.single()` raises an unhandled `APIError` resulting in a 500 instead of a clean 404/422. Should wrap in try/except. | Bug Hunter |
| Minor | backend/tests/api/test_admin.py:279 | Dead letter queue test mock data references `"scrape_shop"` job_type string which no longer exists in the JobType enum. While the test passes (string comparison), this is a stale reference that could confuse future developers. | Bug Hunter |
| Minor | backend/tests/workers/test_daily_batch_scrape.py:14-18 | Test data uses placeholder IDs ("shop-1", "sub-1", "user-1") instead of realistic UUIDs. Violates testing philosophy's realistic test data requirement. | Test Philosophy |
| Minor | backend/tests/api/test_admin.py:416,461 | Test names framed around implementation details ("only_queries_scrape_batch_job_type", "does_not_fall_back_to_scrape_shop_format") rather than user actions/outcomes. | Test Philosophy |

### Validation Results

| Finding | File:Line | Verdict | Notes |
|---------|-----------|---------|-------|
| Missing error handling for shop-not-found in SCRAPE_BATCH enqueue | admin_shops.py:451 | **Valid** | `.single()` raises APIError on no-match, propagates as 500. Should catch and return 404/422. |
| Stale "scrape_shop" string in dead letter test mock data | test_admin.py:279 | **Debatable** | Test still passes — it's just mock data for a different endpoint. But it could confuse and the value is no longer valid. Fix anyway. |
| Placeholder test data IDs | test_daily_batch_scrape.py:14-18 | **Debatable** | The test is readable with short IDs and the structure is correct. Fix anyway (lean conservative). |
| Implementation-framed test names | test_admin.py:416,461 | **Debatable** | Tests are clear about what they verify. Fix anyway (lean conservative). |
