# ADR: Name Matching Algorithm for Data Pipeline

**Date:** 2026-02-23  
**Status:** Accepted  
**Deciders:** Data pipeline team  
**Context file:** `scripts/prebuild/data-pipeline/utils/matching.ts`

---

## Context

The Pass 1 verification step matches Cafe Nomad shop names against Google Maps results using name similarity + coordinate proximity. The current algorithm uses **Sørensen-Dice on character sets**, which has four critical weaknesses at Taiwan's ~1,600-shop scale:

### Current Weaknesses

**1. Character-set Dice loses frequency and order**  
`"好咖啡中山店"` and `"好咖啡信義店"` produce sets `{好,咖,啡,中,山,店}` vs `{好,咖,啡,信,義,店}` — Dice on these sets yields ~0.67 and will incorrectly match branch A to branch B results that fall within 200m.

**2. CJK inflation**  
Common characters (咖, 啡, 好, 店, 咖啡館) inflate scores between unrelated shops. Two completely different cafes sharing only `{咖,啡}` will score 0.5, meeting the match threshold.

**3. No brand/branch awareness**  
Taiwan has ~524 路易莎 (Louisa) stores, ~500 Starbucks, ~435 85°C. A search for "路易莎咖啡 中山店" may return both "路易莎咖啡 中山店" and "路易莎咖啡 信義店" within 200m. Dice sees two near-identical character sets and picks by confidence tie-breaking — incorrect.

**4. No suffix stripping**  
"好咖啡" vs "好咖啡咖啡館" scores lower than it should because `咖啡館` adds shared characters that dilute the ratio instead of being recognized as a noise suffix.

**5. Only 2-tier output**  
Matched vs unmatched. No "needs review" tier for human inspection of borderline cases (0.50–0.75 confidence).

---

## Alternatives Evaluated

| Algorithm | CJK Suitability | Handles Reordering | Subset Matching | Complexity |
|-----------|----------------|-------------------|-----------------|------------|
| Jaccard (character sets) | Poor — frequency blind | No | Partial | Minimal |
| Sørensen-Dice (current) | Poor — same issues as Jaccard | No | Partial | Minimal |
| Levenshtein / Jaro-Winkler | Poor for CJK — treats all chars as equally distant | No | No | Low |
| **fuzzball token_set_ratio** | **Good — token-level, handles mixed CJK+Latin** | **Yes** | **Yes** | **Low (1 dep)** |
| FuzzyChinese (stroke/radical TF-IDF) | Excellent — visual similarity | No | No | Medium (Python only) |
| Sentence Transformer embeddings | Best — semantic matching | N/A | N/A | High (ML infra) |

### Why not Levenshtein/Jaro-Winkler?
Edit-distance metrics assume character-level proximity is meaningful. For CJK, `中` and `信` are equally "distant" edit-wise but semantically unrelated. These metrics also don't handle reordering (`好咖啡中山` vs `中山好咖啡`).

### Why not FuzzyChinese?
Excellent CJK semantic matching via stroke/radical similarity, but Python-only. Our pipeline is TypeScript/Node.js. Not worth a cross-language bridge at 1,600-shop scale.

### Why not Sentence Transformers?
Best semantic accuracy, but requires ML inference infra (Python or ONNX runtime), model download/caching, and GPU/CPU overhead. Overkill for a one-time data pipeline matching ~1,600 shops.

### Why fuzzball token_set_ratio?
`token_set_ratio` works as follows:
1. Tokenize both strings (by whitespace/punctuation, with CJK characters treated as individual tokens when `force_ascii: false, full_process: false`)
2. Sort tokens
3. Compute the ratio of: `sorted_intersection` vs both `sorted_intersection + sorted_remainder_a` and `sorted_intersection + sorted_remainder_b`
4. Return the best score

This handles:
- **Reordering**: `中山好咖啡` vs `好咖啡中山店` — sorted intersection wins
- **Subsets**: `好咖啡` vs `好咖啡咖啡館` — intersection `{好咖啡}` scores vs full string; combined with name normalization (suffix stripping), this matches correctly
- **Mixed CJK+Latin**: `cama cafe 中山` vs `cama 中山` — token-level matching handles both scripts

**Critical implementation note:** fuzzball's `force_ascii` defaults to `true`, which strips all non-ASCII characters, destroying all CJK input. Every call **must** pass `{ force_ascii: false, full_process: false }`.

---

## Decision

**Upgrade to:** fuzzball `token_set_ratio` + name normalization + chain dictionary + 3-tier confidence output.

### Components

**1. Name normalizer** (`utils/name-normalizer.ts`)  
- Full-width → half-width conversion (U+FF01..U+FF5E → U+0021..U+007E)
- Lowercase
- Whitespace collapse + trim
- Noise suffix stripping (longest-match first): `咖啡蛋糕烘焙專賣店`, `咖啡烘焙專賣店`, `咖啡專賣店`, `咖啡工作室`, `咖啡館`, `咖啡店`, `咖啡廳`, `門市`, `分店`, `coffee shop`, `cafe`

**2. Chain dictionary** (`utils/chain-dictionary.ts`)  
Top 10+ Taiwan coffee chains with aliases. Enables brand-exact matching + branch discrimination.

**3. Upgraded `fuzzyNameScore`**  
Replaces Dice with `fuzz.token_set_ratio(normalizeName(a), normalizeName(b), { force_ascii: false, full_process: false }) / 100`.

**4. Chain-aware `findBestMatch`**  
For chain shops: require brand alias match, then score on branch token similarity. Prevents 路易莎 中山店 from matching 路易莎 信義店.

**5. 3-tier output**  
- `>= 0.75` → `pass1-verified.json` (high confidence, auto-accept)
- `0.50–0.74` → `pass1-review.json` (medium confidence, human review)
- `< 0.50` → `pass1-unmatched.json` (no match / low confidence)

---

## Rationale

**Cost/accuracy tradeoff at scale:** At ~1,600 shops, a one-time data pipeline can afford a 5ms synchronous fuzz call per candidate. The chain dictionary eliminates the largest class of false positives (chain store cross-matching) with O(1) lookup.

**No ML infra required:** fuzzball is a pure-JS port of RapidFuzz/python-Levenshtein token matching. Single npm dependency, works in Node.js ESM with tsx CJS interop.

**Threshold calibration:** The 0.75/0.50 thresholds are derived from empirical observation on CJK coffee shop names:
- Identical names (after normalization): 1.0
- Same brand, different branch: ~0.60–0.80 (handled by chain detection before scoring)
- Partial name match (e.g., suffix stripped): ~0.80–1.0
- Different shops sharing common chars (咖, 啡): ~0.30–0.50
- Completely unrelated: 0.0–0.20

---

## Future Roadmap

This decision is scoped to the one-time data pipeline (~1,600 shops). If the matching requirement evolves, consider:

1. **Multi-signal scoring**: Combine name score + address similarity + category match + phone number match. Weights tunable per signal quality.
2. **Embedding-based matching**: If scaling to 10K+ shops or implementing real-time matching (e.g., user-submitted shops), use `text-embedding-3-small` with cosine similarity. Already in the stack for semantic search.
3. **FuzzyChinese** (if Python service added): For radical/stroke-level visual similarity — useful for OCR'd shop names from photos.

---

## Consequences

**Positive:**
- Eliminates CJK inflation false positives
- Correct chain/branch discrimination for 1,400+ chain stores
- Suffix stripping improves matching for shops with marketing suffixes
- 3-tier output reduces manual review burden (only medium-confidence cases need review)

**Negative:**
- One additional npm dependency (fuzzball ~50KB)
- `force_ascii: false` must be enforced on every call — easy to forget
- Chain dictionary requires maintenance as new chains open/close

**Neutral:**
- Existing `fuzzyNameScore` signature unchanged — all downstream callers unaffected
- Test suite extended but existing tests preserved
