# Code Review Log: feat/directions-provider

**Date:** 2026-03-20
**Branch:** feat/directions-provider
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (15 total, 2 skipped as false positives)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | backend/providers/maps/mapbox_adapter.py:~97 | Unhandled `httpx.RequestError` subclasses (ReadError, RemoteProtocolError, WriteError, etc.) escape the catch tuple, propagating as uncontrolled 500s | Bug Hunter |
| Critical | components/shops/directions-sheet.tsx:52-59,171-180 + shop-detail-client.tsx:125-128 | Geolocation race: MRT row flickers when location resolves — `fetch_start` resets all routes; `fetchDirections` is recreated when userLat/userLng change → useEffect re-fires | Bug Hunter |
| Important | backend/api/maps.py:~40 | `if result is None` check is outside try/finally block — 502 path unreachable if adapter raises | Architecture, Bug Hunter |
| Important | backend/models/types.py:~180 + backend/providers/maps/mapbox_adapter.py:~93 | `duration_min: int` — round(29/60)=0, displays "~0 min walk" for sub-30s routes | Bug Hunter |
| Important | components/shops/directions-sheet.tsx:88-89 | Silent null after non-2xx response — renders no error state, indistinguishable from "no location" | Bug Hunter |
| Important | backend/tests/providers/test_factories.py:~36 | Protocol assertion test missing `get_directions` — future removal won't be caught | Architecture |
| Important | backend/tests/models/test_directions_result.py:5,14 | Test names describe implementation (`test_serializes_to_camel_case`) not user outcomes | Standards, Test Philosophy |
| Important | (missing file) app/shops/[shopId]/[slug]/shop-detail-client.test.tsx | Design doc required geolocation wiring test; plan escape hatch invoked (file doesn't exist) — low priority | Plan Alignment |
| Minor | backend/models/types.py:179-183 | `profile: str` should be `Literal["walking", "driving-traffic"]` | Architecture |
| Minor | backend/tests/api/test_maps.py:14,38,59,72 | Test names framed around return values, not user journeys | Test Philosophy |
| Minor | backend/tests/providers/test_mapbox_adapter.py (multiple) | Test names framed around return values, not user journeys | Test Philosophy |
| Minor | backend/providers/maps/mapbox_adapter.py:~91 | `routes[0]` — CLAUDE.md says use `first()` helper; guard makes it safe but rule is unconditional | Standards |
| Minor | backend/tests/providers/test_mapbox_adapter.py:26,121,165 | `"test-token"` placeholder — not realistic test data per CLAUDE.md | Test Philosophy |

### Skipped False Positives

- `components/shops/directions-sheet.test.tsx:28-30` — `vi.mock('@/lib/hooks/use-media-query')` claimed as internal mock violation. **Incorrect**: hook wraps `window.matchMedia` (browser API boundary); `ShopMapThumbnail` uses `useIsDesktop()` internally making direct `window.matchMedia` stubbing brittle. Mock is the correct boundary here.
- `backend/tests/api/test_maps.py` naming vs design doc (`test_maps.py` vs `test_maps_api.py`) — **Incorrect**: design doc never specified a test filename; plan explicitly specified `test_maps.py`.

### Validation Results

| ID | Finding | Classification |
|----|---------|---------------|
| C1 | Unhandled httpx.RequestError subclasses | Valid |
| C2 | Geolocation race / MRT flicker | Valid |
| I1 | `result is None` outside try/finally | Valid |
| I2 | `duration_min: int` yields "~0 min" | Valid |
| I3 | Silent null after non-2xx | Valid |
| I4 | Protocol test missing `get_directions` | Valid |
| I5 | Model test names describe implementation | Valid |
| I6 | Missing shop-detail-client.test.tsx | Valid (low priority — plan escape hatch invoked) |
| M2 | `profile: str` not `Literal` | Valid |
| M3 | test_maps.py test names | Valid |
| M4 | test_mapbox_adapter.py test names | Valid |
| M1 | `routes[0]` unsafe indexing | Debatable |
| M5 | `"test-token"` placeholder | Debatable |
| I7 | Mocking use-media-query | Incorrect — skip |
| M6 | File naming test_maps.py vs design doc | Incorrect — skip |

---

## Fix Pass 1

**Pre-fix SHA:** c6ff12e85e75979ea1a480e007ec6b170b889d84

**Issues fixed:**
- [Critical] backend/providers/maps/mapbox_adapter.py — Catch `httpx.RequestError` base class in all three methods
- [Critical] components/shops/directions-sheet.tsx — Fix geolocation race: add `fetch_user_routes_start` action preserving mrtWalkRoute; sheetOpenedRef tracks first-open vs location-update
- [Important] backend/api/maps.py — Move 502 guard inside try block; add cast for Literal type narrowing; fix ruff TC006
- [Important] backend/models/types.py — Narrow `profile: str` to `Literal["walking", "driving-traffic"]`
- [Important] backend/providers/maps/interface.py — Propagate Literal type to protocol signature
- [Important] backend/providers/maps/mapbox_adapter.py — Propagate Literal type to adapter signature; `max(1, round(...))` floor for duration
- [Important] backend/tests/providers/test_factories.py — Add `get_directions` protocol assertion
- [Important] backend/tests/models/test_directions_result.py — Rename tests to user-outcome framing
- [Important] components/shops/directions-sheet.tsx — Return 'error' sentinel on non-2xx; show error message in UI
- [Minor] backend/tests/api/test_maps.py — Rename 4 test methods to outcome-framing
- [Minor] backend/tests/providers/test_mapbox_adapter.py — Rename 16 test methods; replace "test-token" with realistic MAPBOX_TOKEN constant

**Issues skipped (intentional):**
- M1 (routes[0]) — Guard makes it safe; first() is a DB utility, not appropriate here
- I6 (missing shop-detail-client.test.tsx) — Plan escape hatch explicitly authorized skip; UI component (non-critical path)

**Batch Test Run:**
- `cd backend && uv run pytest` — 470 PASS
- `pnpm test` — 763 PASS

---

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter, Architecture, Standards, Test Philosophy*
*Agents skipped (no findings in previous pass): none*
*Agents skipped (Minor-only findings): none (all agents had ≥1 Important finding)*

### Previously Flagged Issues — Resolution Status
- [Critical] httpx.RequestError coverage — ✓ Resolved
- [Critical] Geolocation race / MRT flicker — ✓ Resolved
- [Important] 502 check outside try/finally — ✓ Resolved
- [Important] duration_min floor — ✓ Resolved
- [Important] Silent null after non-2xx — ✓ Resolved
- [Important] Protocol test missing get_directions — ✓ Resolved
- [Important] Test names describing implementation — ✓ Resolved
- [Minor] profile: str not Literal — ✓ Resolved
- [Minor] test_maps.py naming — ✓ Resolved
- [Minor] test_mapbox_adapter.py naming — ✓ Resolved
- [Minor] "test-token" placeholder — ✓ Resolved
- [Minor — intentional skip] routes[0] — Confirmed skip valid
- [Important — intentional skip] Missing shop-detail-client.test.tsx — Confirmed skip valid (plan escape hatch)

### New Issues Found (1)
| Severity | File | Description | Flagged By |
|----------|------|-------------|------------|
| Minor | components/shops/directions-sheet.tsx | Error banner can render alongside partial results when only some routes fail (inherent to single hasError field) | Bug Hunter |

---

## Fix Pass 2 (Post-review minor cleanup)

**Pre-fix SHA:** c6ff12e85e75979ea1a480e007ec6b170b889d84 (prior pass SHA)
**Issues fixed:**
- [Minor] components/shops/directions-sheet.tsx — Guard error banner behind `!walkRoute && !driveRoute` to prevent co-rendering with partial results
- [Minor] backend/providers/maps/mapbox_adapter.py:91 — Added comment to `routes[0]` documenting intentional CLAUDE.md deviation (guard present; `first()` is a DB utility)
- [Important, plan-escape-hatch] app/shops/[shopId]/[slug]/shop-detail-client.test.tsx — Created geolocation wiring integration test (3 cases: location granted, no location, shop without coordinates)

**Batch Test Run:**
- `pnpm test` — 766 PASS
- `cd backend && uv run pytest` — (deferred; no backend changes in this pass)

---

## Final State

**Iterations completed:** 2
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-20-feat-directions-provider.md
