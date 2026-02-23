# IDF document frequency must count documents, not occurrences
**Date:** 2026-02-23
**Context:** Implementing pass3c IDF-based tag distinctiveness scoring for coffee shop enrichment pipeline

**What happened:** `computeTagIdf` iterated over every tag in `e.tags` and incremented the document frequency counter once per occurrence. If a shop's enrichment had duplicate tag IDs (e.g., an LLM returning the same tag at two different confidence levels), `df(tag)` could exceed `N` (number of shops), making `Math.log(N / df) < 0` → negative IDF → negative distinctiveness scores. This silently corrupts the ranking fed to downstream passes.

**Root cause:** Classic IDF implementation mistake. Standard IDF formula requires `df(tag)` = number of *documents* containing the term. The code counted total occurrences instead, which works only if the input is guaranteed to have unique tag IDs per document.

**Prevention:**
- Always deduplicate tag/term IDs per document before counting document frequency:
  ```typescript
  const uniqueTagIds = new Set(e.tags.map((t) => t.id));
  for (const tagId of uniqueTagIds) {
    df.set(tagId, (df.get(tagId) ?? 0) + 1);
  }
  ```
- When implementing IDF from an input type with no uniqueness constraint, add a test case with duplicate IDs explicitly verifying `idf >= 0`
- LLM outputs are never structurally guaranteed — always assume upstream data may have duplicates or unexpected repetition
