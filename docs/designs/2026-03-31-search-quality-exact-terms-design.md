# Design: Search Quality for Exact/Specific Terms (DEV-122)

Date: 2026-03-31

## Goal

Users searching for specific menu items (巴斯克蛋糕, 司康) or coffee origins (耶加雪菲, 藝伎)
expect exact or near-exact matches — not semantically adjacent results. The current
vector-only pipeline over-generalizes on high-precision queries.

## Data Audit Findings

- All 170 live shops have descriptions (freetext, Traditional Chinese)
- Specific terms like 耶加雪菲 appear in **0** descriptions, 巴斯克蛋糕 in only 5
- Taxonomy tags are broad categories (pour_over, dessert_menu) — no item or origin tags
- No structured menu data exists; menu specifics are incidental mentions in descriptions
- The enrichment prompt asks for a _vibe summary_ — not a factual inventory of items/origins
- The query classifier detects item_specific/specialty_coffee but its signal is unused in scoring

## Chosen Approach: Option C+ with Enrichment Pipeline Fix

Two parallel tracks:

1. **Enrich the data** — update enrichment to extract structured menu items and origins
2. **Score with intent** — use the query classifier to apply keyword bonuses only for high-precision queries (item_specific, specialty_coffee); generic vibe queries are unchanged

## Architecture

```
Track 1 — Data enrichment (write path)
  enrich_shop handler
    → classify_shop tool gets menu_highlights + coffee_origins fields
    → SYSTEM_PROMPT updated to mention specific item extraction
    → shops table gets two new TEXT[] columns
    → re-enrichment job for all 170 live shops

Track 2 — Search scoring (read path)
  search API
    → normalizer gets NFKC unicode normalization
    → new search_vocabulary.py (term lists → compiled regex at module level)
    → classifier runs BEFORE search, on normalized text
    → query_type passed into SearchService.search()
    → Option C+ scoring: item_specific/specialty_coffee get keyword bonus
    → generic queries: unchanged (0.7 vector + 0.3 taxonomy)
```

## DB Schema

Migration: add two columns to `shops`:

```sql
ALTER TABLE shops
  ADD COLUMN menu_highlights  text[] DEFAULT '{}',
  ADD COLUMN coffee_origins   text[] DEFAULT '{}';
```

No indexes needed — keyword matching happens in Python after pgvector RPC returns
results (170 live shops; array contains in Python is fast enough).

## Enrichment Changes

### classify_shop tool — two new optional fields

```python
"menu_highlights": {
    "type": "array",
    "items": {"type": "string"},
    "description": (
        "Specific food or drink items mentioned in reviews "
        "(e.g. 巴斯克蛋糕, 司康, 手沖, 冷萃). "
        "Only include items explicitly mentioned by name. Max 10."
    )
},
"coffee_origins": {
    "type": "array",
    "items": {"type": "string"},
    "description": (
        "Specific coffee origins or varieties mentioned "
        "(e.g. 耶加雪菲, 藝伎, 衣索比亞). "
        "Use Traditional Chinese names. Max 5."
    )
},
```

### SYSTEM_PROMPT update

Add one sentence to the summary instruction:

> "If reviews mention specific menu items (foods, drinks) or coffee origins by name,
> include them in the summary."

### enrich_shop.py

Store new fields in the `update()` call:

```python
"menu_highlights": result.menu_highlights,  # list[str]
"coffee_origins":  result.coffee_origins,   # list[str]
```

### Re-enrichment

One-time re-enrich job for all 170 live shops via the existing worker queue.

## Classifier & Normalizer Changes

### query_normalizer.py — add NFKC normalization

```python
import unicodedata

def normalize_query(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)  # full-width → half-width, 臺→台
    text = text.lower().strip()
    text = _MULTI_SPACE.sub(" ", text)
    text = _TRAILING_PUNCT.sub("", text)
    return text
```

### backend/core/search_vocabulary.py — new file

Term lists compiled into regex at module level in the classifier.
Terms are stored lowercase (normalizer handles case before matching).

```python
ITEM_TERMS: list[str] = [
    # food — zh + en
    "巴斯克蛋糕", "basque cheesecake",
    "司康", "scone",
    "可頌", "croissant",
    "肉桂捲", "cinnamon roll",
    "提拉米蘇", "tiramisu",
    "鬆餅", "waffle",
    "貝果", "bagel",
    "戚風蛋糕", "chiffon cake",
    "千層蛋糕", "mille crepe",
    "布丁", "pudding",
    # drinks — zh + en
    "手沖", "pour over",
    "冰滴", "cold drip",
    "冷萃", "cold brew",
    "虹吸", "siphon",
    "愛樂壓", "aeropress",
    "拿鐵", "latte",
    "卡布奇諾", "cappuccino",
    "美式", "americano",
    "摩卡", "mocha",
    "抹茶", "matcha",
    "espresso", "義式濃縮",
]

SPECIALTY_TERMS: list[str] = [
    # origins — zh + en
    "耶加雪菲", "yirgacheffe",
    "衣索比亞", "ethiopia",
    "藝伎", "geisha", "gesha",
    "肯亞", "kenya",
    "哥倫比亞", "colombia",
    "巴拿馬", "panama",
    "瓜地馬拉", "guatemala",
    "盧安達", "rwanda",
    "蘇門答臘", "sumatra",
    # processing
    "日曬", "natural process", "natural",
    "水洗", "washed",
    "蜜處理", "honey process",
    "厭氧", "anaerobic",
    # roast / style
    "單品", "single origin",
    "淺焙", "light roast",
    "中焙", "medium roast",
    "深焙", "dark roast",
    "自家烘焙", "self roasted",
    "精品咖啡", "specialty coffee", "specialty",
]
```

### query_classifier.py — compile regex from vocabulary

Replace hardcoded regex with vocabulary-driven compiled patterns:

```python
import re
from core.search_vocabulary import ITEM_TERMS, SPECIALTY_TERMS
from services.query_normalizer import normalize_query

# Compiled once at module level — zero per-request cost
_ITEM_RE = re.compile("|".join(re.escape(t) for t in ITEM_TERMS))
_SPECIALTY_RE = re.compile("|".join(re.escape(t) for t in SPECIALTY_TERMS))

def classify(query: str) -> str:
    normalized = normalize_query(query)
    if _ITEM_RE.search(normalized):
        return "item_specific"
    if _SPECIALTY_RE.search(normalized):
        return "specialty_coffee"
    return "generic"
```

Why regex over frozenset: `re.search()` gives substring matching.
"手沖咖啡" matches the term "手沖"; "yirgacheffe blend" matches "yirgacheffe".
Frozenset requires exact membership — would miss these cases.

## Search Scoring (Option C+)

### api/search.py — classify before search

```python
query_type = classify(text)           # moved before service.search()
response = await service.search(query, mode=mode, query_type=query_type)
```

### SearchService.search() — accept query_type

```python
async def search(
    self,
    query: SearchQuery,
    mode: str | None = None,
    mode_threshold: float = 0.4,
    query_type: str = "generic",
) -> SearchResponse:
```

Pass `query_type` through to `_full_search()`.

### \_full_search() — scoring branches on query type

```python
for row in rows:
    similarity = row.get("similarity", 0.0)
    taxonomy_boost = self._compute_taxonomy_boost(row, query)

    if query_type in ("item_specific", "specialty_coffee"):
        keyword_score = self._compute_keyword_score(row, query.text)
        total = similarity * 0.5 + taxonomy_boost * 0.2 + keyword_score * 0.3
    else:
        total = similarity * 0.7 + taxonomy_boost * 0.3  # unchanged
```

### New \_compute_keyword_score()

```python
def _compute_keyword_score(self, row: dict, query_text: str) -> float:
    normalized = normalize_query(query_text)
    highlights = [h.lower() for h in row.get("menu_highlights", [])]
    origins = [o.lower() for o in row.get("coffee_origins", [])]

    if normalized in highlights or normalized in origins:
        return 1.0
    if any(normalized in h for h in highlights + origins):
        return 0.8
    desc = (row.get("description") or "").lower()
    if normalized in desc:
        return 0.5
    return 0.0
```

### Score weights summary

| Query type       | Vector | Taxonomy | Keyword |
| ---------------- | ------ | -------- | ------- |
| generic          | 0.7    | 0.3      | —       |
| item_specific    | 0.5    | 0.2      | 0.3     |
| specialty_coffee | 0.5    | 0.2      | 0.3     |

### Cache interaction

The 2-tier cache stores full result sets. Entries created before this change will have
stale scores for item_specific/specialty_coffee queries. Cache TTL is 1h — acceptable
to let existing entries expire naturally. No active invalidation needed.

## Testing Strategy

### Unit tests (pytest)

- `test_query_classifier.py` — classify against ITEM_TERMS and SPECIALTY_TERMS;
  full-width variants (ｅｓｐｒｅｓｓｏ); English terms; substring matches (手沖咖啡 → item_specific)
- `test_query_normalizer.py` — NFKC normalization edge cases
- `test_search_service.py` — `_compute_keyword_score` with mock rows; scoring branches
  per query_type; query_type flows from API → service → scoring

### Integration tests (pytest)

- `test_enrich_shop.py` — verify menu_highlights and coffee_origins written to DB after enrichment

### E2E

No new critical path. Existing search journey covers the search endpoint.

### Coverage gate

`search_service.py` is a critical-path service → 80% coverage required after changes.

## Testing Classification

- [ ] **New e2e journey?** No — existing search E2E journey covers the endpoint.
- [ ] **Coverage gate?** Yes — `search_service.py` critical path, verify 80% after changes.

## Alternatives Rejected

**Option A — Keyword boost for all queries:** Applies keyword weight regardless of query
type, slightly weakening vector weights for vibe queries (0.7 → 0.6). Rejected in favour
of Option C+ which preserves generic query behavior exactly.

**Option B — Full PostgreSQL FTS (tsvector + GIN + Chinese tokenization):** Highest
long-term recall quality but requires DB migration, Traditional Chinese tokenizer (CKIP
or bigram), and significant infrastructure work. At 170 live shops the cost/benefit
doesn't justify it for Beta. Revisit at 1000+ shops.

**Frozenset classifier vocabulary:** Exact membership check — misses "手沖咖啡" matching
"手沖". Rejected in favour of compiled regex from vocabulary list.
