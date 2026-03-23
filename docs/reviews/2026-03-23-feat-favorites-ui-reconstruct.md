# Code Review Log: feat/favorites-ui-reconstruct

**Date:** 2026-03-23
**Branch:** feat/favorites-ui-reconstruct
**Mode:** Pre-PR
**HEAD SHA:** 3176e32a8f45cef5b7ebc560f7643acff1891c34

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (30 total — pre-dedup/validation)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Critical | `app/(protected)/lists/[listId]/page.tsx:27` | Race condition: "List not found" flashes on direct nav — isLoading from useListShops but list comes from useUserLists (separate loading state never checked) | Bug Hunter, Architecture |
| 2 | Critical | `components/lists/favorites-desktop-layout.tsx:27-28,31-38` | Delete/rename completely broken on desktop — onDeleteList/onRenameList declared in props but never destructured or wired | Bug Hunter, Standards, Architecture, Plan Alignment |
| 3 | Critical | `components/lists/list-detail-mobile-layout.tsx:42` | Empty-string Mapbox token fallback — passes `''` to mapboxAccessToken causing runtime auth error with no UI fallback | Bug Hunter |
| 4 | Critical | `app/(protected)/lists/page.tsx:56` + `favorites-desktop-layout.tsx` | Desktop overview non-functional — shopsByList hardcoded to `{}`, all lists render 0 shops on desktop | Architecture, Standards, Plan Alignment |
| 5 | Important | `app/(protected)/lists/page.tsx:38-41` | handleRename has no error handling — dialog stays stuck open on network failure | Bug Hunter |
| 6 | Important | `components/lists/favorites-desktop-layout.tsx:63-73` | Desktop always shows "+ New List" ignoring 3-list cap | Bug Hunter |
| 7 | Important | `components/lists/list-detail-mobile-layout.tsx:99,137` | BottomNav z-index (z-40) overlaps bottom sheet (z-30) — dead tap zone at bottom of shop list | Bug Hunter |
| 8 | Important | `components/lists/list-detail-desktop-layout.tsx:43-48` | Inline mapPins array computed in render without useMemo — unnecessary map re-renders | Standards, Architecture |
| 9 | Important | `app/(protected)/lists/page.tsx:56` | Inline `shopsByList={{}}` object literal in render (new reference every render) | Standards |
| 10 | Important | `components/lists/favorites-mini-map.tsx:43` | Emoji ☕ in code — violates CLAUDE.md "no emojis in code" | Standards |
| 11 | Important | `favorites-mobile-layout.tsx:37`, `favorites-desktop-layout.tsx:66` | `prompt()` used for list creation — blocks thread, untestable, violates presentational contract | Standards, Architecture, Plan Alignment |
| 12 | Important | `components/lists/list-detail-mobile-layout.tsx` | Raw react-map-gl Map instead of shared MapViewDynamic — different map style, different pin component | Architecture |
| 13 | Important | `components/lists/favorites-mini-map.tsx:35-46` | Uniform pin color — design requires colored pins per list (listId field ignored) | Plan Alignment |
| 14 | Important | `components/lists/favorites-mini-map.tsx`, `favorites-mobile-layout.tsx:60` | Mini-map pin tap doesn't navigate to list detail — onPinClick/onClick missing | Plan Alignment |
| 15 | Important | `components/lists/favorites-desktop-layout.tsx:76-101` | No "N more shops" expand/truncate in desktop sidebar — design requirement missing | Plan Alignment |
| 16 | Important | `lib/hooks/use-list-pins.test.tsx:7` | Mocks fetchWithAuth (internal module) instead of global.fetch boundary | Test Philosophy |
| 17 | Important | `lib/hooks/use-list-shops.test.tsx:7` | Mocks fetchWithAuth (internal module) instead of global.fetch boundary | Test Philosophy |
| 18 | Important | `components/lists/list-detail-mobile-layout.tsx:46` | Unsafe `[0]` array indexing — use `.at(0)` per CLAUDE.md | Standards, Architecture, Plan Alignment |
| 19 | Minor | `components/lists/favorites-mobile-layout.tsx:86` | photoUrls hardcoded to `[]` — thumbnails never displayed | Bug Hunter |
| 20 | Minor | `components/lists/favorites-shop-row.tsx:24-28` | extractDistrict regex fails for non-city-prefixed addresses | Bug Hunter |
| 21 | Minor | `list-detail-desktop-layout.tsx:10-21`, `list-detail-mobile-layout.tsx:8-19` | ListDetailShop interface duplicated — should import ListShop from use-list-shops | Standards, Architecture |
| 22 | Minor | `components/lists/favorites-mobile-layout.tsx:52-54` | Count badge colors inverted from design spec | Plan Alignment |
| 23 | Minor | `components/lists/favorites-mobile-layout.tsx:67-69` | "My Lists" h2 uses wrong font family and size | Plan Alignment |
| 24 | Minor | `components/lists/favorites-mobile-layout.tsx:70-75` | "+ New List" button missing pill style from design | Plan Alignment |
| 25 | Minor | `components/lists/list-detail-mobile-layout.tsx:99-134` | Bottom sheet is static fixed div — plan specified Vaul draggable sheet | Plan Alignment |
| 26 | Minor | `components/lists/favorites-desktop-layout.tsx:69` | Desktop "New List" button wrong color (orange map-pin vs. green #C8F0D8) | Plan Alignment |
| 27 | Minor | `app/(protected)/lists/page.test.tsx:168` | Test data uses placeholder ID 'list-new' instead of realistic UUID | Test Philosophy |
| 28 | Minor | `components/lists/empty-slot-card.test.tsx:17` | Naming violation — "triggers the callback" is implementation framing | Test Philosophy |
| 29 | Minor | `components/lists/favorites-shop-row.test.tsx:42` | Naming violation — "triggers the callback" is implementation framing | Test Philosophy |
| 30 | Minor | `components/lists/favorites-mobile-layout.tsx:28,87` | useRouter called inside layout component — navigation should be at page layer | Architecture |

### Validation Results

| ID | Classification | Notes |
|----|---------------|-------|
| C1 | Valid | Real race condition |
| C2 | Valid | Delete/rename not destructured in desktop layout |
| C3 | Valid (Debatable) | Empty-string Mapbox token, no guard |
| C4 | Valid | shopsByList hardcoded to `{}`, desktop 0 shops |
| I1 | Valid | handleRename missing try/catch |
| I2 | Valid | Desktop ignores 3-list cap |
| I3 | Valid | BottomNav z-40 overlaps z-30 bottom sheet |
| I4 | Valid | mapPins inline without useMemo |
| I5 | Valid | `shopsByList={{}}` inline object literal |
| I6 | Valid | Emoji in JSX violates CLAUDE.md |
| I7 | Valid (Debatable) | window.prompt() — untestable, inconsistent |
| I8 | Valid (Debatable) | Raw react-map-gl, wrong map style |
| I9 | Valid (Debatable) | Uniform pin color, design requires per-list |
| I10 | Valid | Mini-map pins have no onClick/navigation |
| I11 | Valid (Debatable) | No "N more shops" truncation per design |
| I12 | Valid | Mocks internal fetchWithAuth instead of global.fetch |
| I13 | Valid | Same as I12 |
| I14 | Valid | `shops[0]` unsafe, violates CLAUDE.md |
| M1 | Valid (Debatable) | photoUrls hardcoded to [] |
| M2 | Debatable (Valid) | extractDistrict regex fragile |
| M3 | Valid (Debatable) | ListDetailShop type duplicated |
| M4 | Valid | Count badge colors inverted from spec |
| M5 | Valid | "My Lists" h2 wrong font/size |
| M6 | Valid | "+ New List" missing pill styling |
| M7 | Valid (Debatable) | Static div, not Vaul draggable |
| M8 | Valid | Desktop "New List" button wrong color |
| M9 | Valid | 'list-new' non-UUID test data |
| M10 | **Incorrect** | Test name is correctly user-framed — "a user clicking the card..." |
| M11 | **Incorrect** | Test name is correctly user-framed — "a user clicking the row..." |
| M12 | Valid (Debatable) | useRouter in layout, navigation should be at page layer |

**Skipped (false positives):** M10, M11 — reviewer misread partial test names; both are fully CLAUDE.md-compliant.
