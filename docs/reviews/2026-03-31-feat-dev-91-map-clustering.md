# Code Review Log: feat/dev-91-map-clustering

**Date:** 2026-03-31
**Branch:** feat/dev-91-map-clustering
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (8 total, 2 skipped as incorrect)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | map-view.tsx:73 | `cluster_id` not null-guarded before `getClusterExpansionZoom`; undefined cast to number silently fails | Bug Hunter |
| Important | (whole component) | GL canvas drops per-shop keyboard focus and `aria-label` — real accessibility regression | Architecture |
| Important | map-view.test.tsx:175 | `expect(paintJson).toContain('#E06B3F')` — asserts implementation detail (exact hex), breaks on visual refactors that preserve behavior | Architecture, Test Philosophy |
| Minor | map-view.tsx:88 | `properties?.id as string` unsafe cast; `String(...)` is safer | Bug Hunter |
| Minor | map-view.tsx:158 | `selectedShopId ?? ''` sentinel non-obvious; comment needed to prevent future `?? null` "fix" | Architecture |
| Minor | map-view.test.tsx:118 | Test name references internal "map source" concept, not user-visible outcome | Test Philosophy |

### Skipped (False Positives)
- map-view.tsx:74 — Geometry cast without Point check: **Incorrect** — cluster features can ONLY be Points by definition; filter guarantees this
- map-view.tsx:72,88 — `[0]` indexing: **Incorrect** — both usages are length-guarded; `first()` only exists in e2e scope, not production code

### Validation Results
All findings validated by a dedicated validation agent. See classification above.

---

## Fix Pass 1

**Pre-fix SHA:** 3632c0ac05b39afafee1837390826c1ac389607f

**Issues fixed:**
- [Important] map-view.tsx:73 — Added `clusterId == null` guard before `getClusterExpansionZoom`
- [Important] (component) — Added accessibility comment + `aria-label` on Map canvas; documented regression
- [Important] map-view.test.tsx:175 — Removed `#E06B3F` hex assertion; kept structural `shop-1` assertion
- [Minor] map-view.tsx:88 — Changed `as string` to `String(...)` cast
- [Minor] map-view.tsx:158 — Added comment explaining `?? ''` sentinel safety
- [Minor] map-view.test.tsx:118 — Renamed test to user-outcome framing
