# Code Review Log: fix/home-page

**Date:** 2026-03-28
**Branch:** fix/home-page
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (12 total, pre-validation)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | `map-desktop-layout.tsx:91`, `shop-carousel.tsx:52` | `onCardClick ??` exclusive — selectedShopId never updated on card click | Bug Hunter, Architecture |
| Important | `shop-card-compact.tsx:51` | `photos.at(0)` vs `first()` helper | Standards |
| Important | `map-desktop-layout.test.tsx:9–29` | `next/dynamic` mock wraps own module | Standards |
| Important | `shop-carousel.tsx:8` | `onShopClick` required but functionally dead when `onCardClick` always provided | Bug Hunter |
| Important | `list-mobile/desktop-layout.tsx` | Inconsistent `onShopClick` vs `onCardClick` API across layouts | Architecture |
| Minor | `shop-card-compact.tsx:92–99` | No guard against empty `labelZh` | Bug Hunter |
| Minor | `shop-card-compact.tsx:26–29` | `truncateSnippet` surrogate pair risk | Bug Hunter |
| Minor | `shop-card-compact.tsx:6–18` | Dual-casing fields (pre-existing) | Standards |
| Minor | `map-desktop-layout.test.tsx:31–43` | `vaul` mock (pre-existing pattern) | Standards |
| Minor | `shop-carousel.tsx` | No click-routing tests for onCardClick | Architecture |
| Minor | `shop-card-compact.test.tsx:89–97` | Placeholder tag ids (`t1`–`t7`) | Test Philosophy |
| Minor | `map-desktop-layout.tsx:91` | Inline arrow in map() | Architecture |

### Validation Results

| # | Finding | Classification | Reason |
|---|---------|----------------|--------|
| 1 | Card click drops setSelectedShopId | **By design** | Navigation is immediate — updating selectedShopId before unmount is a no-op. Intent explicit in design doc. Adding code comment. |
| 2 | `photos.at(0)` vs `first()` | **Incorrect** | `at(0)` is safe (no crash on empty array). `first()` helper does not exist in codebase (grep confirmed). |
| 3 | `next/dynamic` mock | **Incorrect** | Mocking a Next.js framework API is mocking a system boundary, not an internal module. Standard practice. |
| 4 | `onShopClick` required but dead | **Debatable → Fix** | Make optional since there's a real `onCardClick` fallback; improves contract clarity. |
| 5 | List vs map layout API inconsistency | **Out of scope** | List layouts not modified in this branch. Would require separate PR to unify. |
| 6 | Empty `labelZh` guard | **Incorrect** | Data quality concern, not a code bug. Component is display-only. |
| 7 | `truncateSnippet` surrogate pairs | **Debatable** | CJK data is BMP-only in practice. Skip. |
| 8 | Dual-casing fields | **Pre-existing** | Not introduced by this branch. Skip. |
| 9 | `vaul` mock | **Pre-existing** | Existing test pattern, not introduced by this branch. Skip. |
| 10 | No ShopCarousel click tests | **Valid → Fix** | Behavior branch with no coverage. |
| 11 | Placeholder tag ids | **Debatable → Fix** | Use realistic slug-style ids to match project conventions. |
| 12 | Inline arrow in map() | **Incorrect** | CLAUDE.md rule is for objects/arrays, not callbacks. Standard React list pattern. |

**Issues to fix:** 3 (finding 4, 10, 11) + code comment for finding 1

## Fix Pass 1

**Pre-fix SHA:** d66c6ecede44de4f163f7f30854239a1a580b585

**Issues fixed:**
- [Important] `shop-carousel.tsx:8` — Made `onShopClick` optional; added `?.` safe invocation
- [Minor] `shop-carousel.tsx` + `.test.tsx` — Added 2 click-routing tests (onCardClick + fallback)
- [Minor] `shop-card-compact.test.tsx:89–97` — Replaced placeholder ids with realistic slug-style taxonomy ids

**Issues skipped (false positives / out of scope):**
- Finding 1 — By design; navigation is immediate
- Findings 2, 3, 6, 12 — Reviewer incorrect (helper doesn't exist, standard patterns)
- Finding 5 — Out of scope (list layouts not in this branch)
- Findings 7, 8, 9 — Pre-existing or theoretical, not introduced here

**Batch Test Run:**
- `pnpm test` — PASS (1009/1009 tests, 184 files)

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter, Standards, Architecture*
*Agents skipped (Minor-only findings): Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Important] `shop-carousel.tsx:8` — ✓ Resolved (onShopClick optional, safe ?.() invocation)
- [Minor] `shop-carousel.tsx` click tests — ✓ Resolved (2 new tests, both pass)
- [Minor] tag test ids — ✓ Resolved (realistic slug ids, assertions updated)

### New Issues Found
None.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None blocking

**Review log:** docs/reviews/2026-03-28-fix-home-page.md
