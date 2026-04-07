# DEV-282: Search Quality Improvements

## Context

DEV-265 validated search quality (NDCG@5 0.706, 11/20 wins vs Google Maps). Win-rate (55%) missed the 70% internal target. Four improvements identified to close the gap: expand vibe taxonomy, add photo-assisted enrichment, add physical feature tags from structured Apify data, and fix score normalization asymmetry in the eval script. One atomic PR covering all four tracks.

---

## Track 1: Vibe Taxonomy Expansion

**Goal:** Add ~13 new tags to close gaps exposed by eval failures. Current taxonomy: 79 tags across 5 dimensions (functionality, time, ambience, mode, coffee).

**New tags to add to `data/prebuild/taxonomy.json`:**

| Dimension     | ID                    | labelZh       |
| ------------- | --------------------- | ------------- |
| functionality | `natural_light`       | 自然光充足    |
| functionality | `private_rooms`       | 有包廂/隔間   |
| functionality | `window_seats`        | 窗邊座位      |
| functionality | `large_tables`        | 大桌/共享桌   |
| functionality | `second_floor`        | 二樓/複層空間 |
| ambience      | `文青`                | 文青風格      |
| ambience      | `療癒系`              | 療癒系        |
| ambience      | `復古工業`            | 復古工業風    |
| ambience      | `日系簡約`            | 日系簡約      |
| ambience      | `IG打卡`              | IG打卡熱點    |
| ambience      | `old_house_renovated` | 老屋改建      |
| ambience      | `tropical_plants`     | 綠意盎然      |
| coffee        | `rare_beans`          | 稀有豆/競標豆 |

**Files:**

- `data/prebuild/taxonomy.json` — add tags (curated directly, no re-generation needed)
- `scripts/prebuild/data-pipeline/pass3a-taxonomy-seed.ts` — update generation prompt to include physical features in functionality guidance; update `flattenProposalToTags` to handle `coffee` dimension
- `scripts/prebuild/data-pipeline/types.ts` — add optional `coffee` to `TaxonomyProposal` interface
- New Supabase migration — `INSERT INTO taxonomy_tags` for new tags (additive only, no schema change)

---

## Track 2: Photo-Assisted Vibe Enrichment

**Goal:** Feed VIBE-classified photos into the enrichment LLM so vibe tags are assessed visually, not just from review text.

**Pipeline change:** Remove `ENRICH_SHOP` enqueue from scrape handler. Instead, `classify_shop_photos` enqueues `ENRICH_SHOP` on completion (same pattern as `ENRICH_MENU_PHOTO`).

```
Before: scrape → [enrich_shop, classify_shop_photos] (parallel)
After:  scrape → classify_shop_photos → enrich_shop
```

**Photo selection changes (in `apify_adapter.py`):**

- `maxImages`: 10 → 15
- Remove recency re-sort — trust Google's default order (their quality/engagement algorithm)
- Age filter: drop > 3 years (changed from 5 years)

**Files:**

- `backend/providers/scraper/apify_adapter.py` — bump `maxImages` to 15, remove `uploadedAt` re-sort, change age cutoff to 3 years
- `backend/workers/handlers/scrape_batch.py` — remove `ENRICH_SHOP` job enqueue
- `backend/workers/handlers/classify_shop_photos.py` — enqueue `ENRICH_SHOP` after all photos for a shop are classified
- `backend/workers/handlers/enrich_shop.py` — query `shop_photos WHERE shop_id = ? AND category = 'VIBE' LIMIT 3`, pass URLs into enrichment input
- `backend/models/types.py` — add `vibe_photo_urls: list[str] = []` to `ShopEnrichmentInput`
- `backend/providers/llm/anthropic_adapter.py` — update `_build_enrich_messages` to include image content blocks when `vibe_photo_urls` is non-empty:
  > "The following photos show the shop's physical space and vibe. Use them to assess visual attributes like aesthetic style, ambience, and physical features."

---

## Track 3: Physical Feature Tags via Apify Structured Data

**Goal:** Extract physical features from Apify's `additionalInfo` field and pass as high-confidence signals to enrichment. No DB migration — features flow through the job payload.

**Apify `additionalInfo` example:**

```json
{
  "Service options": { "Outdoor seating": true },
  "Accessibility": { "Wheelchair-accessible entrance": true }
}
```

**Mapping (in `_extract_maps_features`):**

- `Outdoor seating` → `outdoor_seating`
- `Wheelchair-accessible entrance` → `wheelchair_accessible`
- etc. (extensible mapping dict)

**Files:**

- `backend/providers/scraper/interface.py` — add `google_maps_features: dict[str, bool] = {}` to `ScrapedShopData`
- `backend/providers/scraper/apify_adapter.py` — add `_extract_maps_features(place)` static method; populate field in `_parse_place`
- `backend/workers/handlers/scrape_batch.py` — include `google_maps_features` in the `ENRICH_SHOP` job payload (queued from classify handler per Track 2)
- `backend/models/types.py` — add `google_maps_features: dict[str, bool] = {}` to `ShopEnrichmentInput`
- `backend/workers/handlers/enrich_shop.py` — pass features from job payload into `ShopEnrichmentInput`
- `backend/providers/llm/anthropic_adapter.py` — in `_build_enrich_prompt`, when `google_maps_features` is non-empty append:
  > "Confirmed Google Maps features: outdoor_seating, natural_light. Assign confidence >= 0.9 to tags matching confirmed features."

---

## Track 4: Score Normalization Fix

**Goal:** Replace 3-point LLM judge (0-2 → {1,3,5}) with 5-point scale (0-4 → {1,2,3,4,5}) to eliminate gaps and align with Maps 1-5 human scores.

**Changes in `backend/scripts/run_search_eval.py`:**

- `_JUDGE_SYSTEM` rubric: 0=irrelevant, 1=marginal, 2=partial, 3=relevant, 4=highly relevant
- `_normalize_score(s)` → `return s + 1`
- Score clamping: `max(0, min(4, ...))`
- `top1_relevant` threshold: `>= 2` (preserves "partially relevant or better" semantic)

**Test updates in `backend/tests/scripts/test_search_eval_validate.py`:**

- Update all `caferoam_scores` fixtures from 0-2 to 0-4 scale
- Update expected `caferoam_normalized` values (old: `s*2+1`, new: `s+1`)

---

## Implementation Sequence

1. **Track 4** — score normalization (isolated, lowest risk; establishes corrected baseline)
2. **Track 1** — taxonomy expansion + migration (no pipeline change)
3. **Track 3** — physical feature extraction (scraper model changes)
4. **Track 2** — photo pipeline changes (pipeline ordering change + enrichment update)
5. **Backfill** — re-run enrichment on existing corpus with expanded taxonomy + photos
6. **Validate** — `run_search_eval.py --validate`; confirm NDCG@5 improvement + win-rate toward 70%

---

## Testing

| Test                                   | Type        | File                                                  |
| -------------------------------------- | ----------- | ----------------------------------------------------- |
| Score normalization (0-4 scale)        | Unit        | `backend/tests/scripts/test_search_eval_validate.py`  |
| `_extract_maps_features` parsing       | Unit        | New: `backend/tests/providers/test_apify_features.py` |
| Enrichment with vibe photos + features | Unit        | `backend/tests/workers/test_enrich_shop.py`           |
| classify → enrich pipeline ordering    | Unit        | `backend/tests/workers/test_classify_shop_photos.py`  |
| End-to-end NDCG + win-rate             | Integration | `run_search_eval.py --validate`                       |

Testing classification:

- [ ] New e2e journey? No — no new critical user path
- [x] Coverage gate: touches eval script + enrichment worker. Verify 80% coverage on changed paths.

---

## Verification

1. `cd backend && pytest` — all tests pass
2. `ruff check .` — no lint errors
3. `run_search_eval.py --validate` — NDCG@5 > 0.706 baseline, win-rate improvement toward 70%
4. Spot-check: pick 3 shops with VIBE photos, confirm new vibe tags appear post-enrichment

---

## Key Files

| File                                                     | Change                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `data/prebuild/taxonomy.json`                            | Add 13 new tags                                                            |
| `scripts/prebuild/data-pipeline/pass3a-taxonomy-seed.ts` | Update prompt + flattenProposalToTags                                      |
| `scripts/prebuild/data-pipeline/types.ts`                | Add optional coffee to TaxonomyProposal                                    |
| `backend/providers/scraper/interface.py`                 | Add google_maps_features to ScrapedShopData                                |
| `backend/providers/scraper/apify_adapter.py`             | maxImages→15, remove recency sort, 3yr age filter, \_extract_maps_features |
| `backend/workers/handlers/scrape_batch.py`               | Remove ENRICH_SHOP enqueue                                                 |
| `backend/workers/handlers/classify_shop_photos.py`       | Enqueue ENRICH_SHOP on completion                                          |
| `backend/workers/handlers/enrich_shop.py`                | Query VIBE photos, pass features from payload                              |
| `backend/models/types.py`                                | Add vibe_photo_urls + google_maps_features to ShopEnrichmentInput          |
| `backend/providers/llm/anthropic_adapter.py`             | Image content blocks + confirmed features in prompt                        |
| `backend/scripts/run_search_eval.py`                     | 0-4 rubric, s+1 normalization                                              |
| `backend/tests/scripts/test_search_eval_validate.py`     | Update fixtures for 0-4 scale                                              |
| New: Supabase migration                                  | INSERT new taxonomy tags                                                   |
| New: `backend/tests/providers/test_apify_features.py`    | Test \_extract_maps_features                                               |
