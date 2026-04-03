# Search Classifier Reverse Matching + Vocabulary Enrichment — Design

**Ticket:** DEV-198
**Date:** 2026-04-03

## Problem

Searching for "西西里", "咖啡", "巴斯克" returns no/near-empty results. These are valid, common queries in Taiwan coffee culture. Root causes:

1. **Forward-only classifier** — the classifier checks if vocabulary terms are substrings of the query (`_ITEM_RE.search(query)`), but not vice versa. "巴斯克蛋糕" is NOT a substring of "巴斯克", so the partial query falls through to `generic`.

2. **Missing vocabulary** — "西西里咖啡" (Sicilian coffee, espresso + citrus) is a hugely popular drink in Taiwan indie coffee shops but was never added to the vocabulary. Shops were never enriched with this term.

3. **Stale cache** — "咖啡" was classified as `generic`, producing a cache key that may point to a stale empty-result entry from before shop embeddings existed. Reclassifying it to `item_specific` changes the cache key hash, bypassing the stale entry.

## Design

### Reverse substring matching

After each forward regex check in `classify()`, add a reverse check: if the normalized query is found as a substring within any vocabulary term, classify it accordingly.

**Minimum length guard** to avoid false positives from single-character noise:

- 2+ CJK characters (e.g., "咖啡" ✓, "蛋" ✗)
- 3+ Latin characters (e.g., "basque" ✓, "ba" ✗)

Priority preserved: item_specific (forward or reverse) > specialty_coffee (forward or reverse) > generic.

### Vocabulary enrichment

47 new terms added to `search_vocabulary.py`, curated from common Taiwan indie coffee shop menus:

- **ITEM_TERMS — Drinks:** 西西里咖啡, 維也納咖啡, 黑糖拿鐵, 阿芙佳朵, 黑咖啡, 防彈咖啡, 咖啡歐蕾, 康寶藍, 掛耳, 鮮奶茶, 紅茶拿鐵, 鍋煮奶茶, 柴拿鐵, 紅茶, 鴛鴦 + English equivalents
- **ITEM_TERMS — Food:** 舒芙蕾, 布朗尼, 達克瓦茲, 生乳捲, 甜甜圈, 水果塔, 帕尼尼, 早午餐 + English equivalents
- **SPECIALTY_TERMS:** 台灣咖啡, 台灣豆, 配方豆, 拉花, 杯測 + English equivalents + SOE

These terms feed both the classifier regex (query classification) and the LLM enrichment prompt (shop data extraction).

## Fix verification per query

| Query  | Before  | After         | Why                                                                    |
| ------ | ------- | ------------- | ---------------------------------------------------------------------- |
| 巴斯克 | generic | item_specific | Reverse matches "巴斯克蛋糕" in ITEM_TERMS                             |
| 西西里 | generic | item_specific | Reverse matches new "西西里咖啡" in ITEM_TERMS                         |
| 咖啡   | generic | item_specific | Reverse matches new "西西里咖啡" in ITEM_TERMS; cache key hash changes |
| basque | generic | item_specific | Reverse matches "basque cheesecake" in ITEM_TERMS                      |
| 蛋     | generic | generic       | Below 2-CJK minimum — no false positive                                |

## Files changed

- `backend/services/query_classifier.py` — reverse matching logic
- `backend/core/search_vocabulary.py` — 47 new terms
- `backend/tests/services/test_query_classifier.py` — 8 new tests

## Not changed

- `search_service.py` — scoring logic unchanged
- `api/search.py` — endpoint unchanged
- Cache system — stale entries expire naturally; reclassified queries get new cache keys
- No DB migrations needed
