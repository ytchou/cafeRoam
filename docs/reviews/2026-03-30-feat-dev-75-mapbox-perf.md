# Code Review Log: feat/dev-75-mapbox-perf

**Date:** 2026-03-30
**Branch:** feat/dev-75-mapbox-perf
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (15 total, pre-dedup)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | `lib/hooks/use-device-capability.ts:8–18` | Hydration mismatch: server renders `isLowEnd=false`, client hydrates with `isLowEnd=true` on low-end devices — causes UI flicker and React hydration warning | Bug Hunter |
| 2 | Important | `components/map/map-with-fallback.tsx:37–40` | `forceMap` resets on re-mount — user's "load map" choice lost on back navigation | Bug Hunter, Architecture |
| 3 | Important | `app/page.tsx:124–150` | Mobile list-view shop taps regress: `handleShopNavigate` (router push) used instead of `setSelectedShopId` (sheet open) — prop shadowing with `onShopClick` in `layoutProps` is also fragile | Bug Hunter, Architecture |
| 4 | Important | `components/map/__tests__/map-with-fallback.test.tsx:11–22` | Mocks internal layout components (`MapMobileLayout`, `MapDesktopLayout`, `ListMobileLayout`, `ListDesktopLayout`) — violates "mock at boundaries only" rule. Should mock `mapbox-gl` or `MapViewDynamic` instead | Standards, Architecture, Test Philosophy |
| 5 | Important | `lib/hooks/__tests__/use-device-capability.test.ts:27–60` | Test descriptions frame behaviour as function return values ("reports low-end when deviceMemory is 1GB"), not user outcomes | Standards |
| 6 | Important | `lib/hooks/use-device-capability.ts` | Named as a hook but contains no React primitives — should be `getDeviceCapability` (plain function). Causes unnecessary Rules-of-Hooks constraints on callers | Architecture |
| 7 | Important | `components/map/map-with-fallback.tsx` | Missing progressive background loading for capable devices — design spec requires list-first with auto-swap to map; implementation renders map immediately | Plan Alignment |
| 8 | Important | `components/map/map-with-fallback.tsx` | Missing import failure error handling — design spec requires "地圖載入失敗" inline error with retry button; not implemented | Plan Alignment |
| 9 | Important | `e2e/performance/map-perf.spec.ts:49–52` | Measures canvas visibility, not Mapbox `load` event — design spec specifies `load` event; canvas appears before tiles finish rendering | Plan Alignment |
| 10 | Important | `ASSUMPTIONS.md` | T4 update incomplete — metrics not collected; plan requires actual perf metrics from a test run | Plan Alignment |
| 11 | Important | `app/__tests__/find-page-integration.test.tsx:5–54` | Mocks all internal hooks (`use-shops`, `use-search`, `use-geolocation`, etc.) — reduces integration test to a trivial wiring check | Test Philosophy |
| 12 | Minor | `e2e/performance/map-perf.spec.ts:55–117` | FPS measurement collected before/after pan gesture, not during — metric doesn't reflect interactive jank | Bug Hunter |
| 13 | Minor | `e2e/performance/map-perf.spec.ts:19` | Module-level `cdp` variable is fragile if parallel tests added | Bug Hunter |
| 14 | Minor | `e2e/performance/map-perf.spec.ts:55–117` | FPS measurement `page.evaluate` block duplicated verbatim — DRY violation | Architecture |
| 15 | Minor | `app/__tests__/find-page-integration.test.tsx:64` | Test name is an implementation detail ("renders MapWithFallback instead of direct layout components"), not a user outcome | Test Philosophy |

### Validation Results

All 15 issues classified. No false positives (Incorrect) found.

| # | Classification | Notes |
|---|---------------|-------|
| 1 | Valid | SSR hydration mismatch |
| 2 | Valid | forceMap lost on re-mount |
| 3 | Valid | onCardClick always resolves to navigate; mobile list taps navigate instead of selecting |
| 4 | Debatable | Boundary principle violated; fix anyway |
| 5 | Valid | Test names describe internal state, not outcomes |
| 6 | Debatable | Moot once Issue 1 fixed (hook will use useState/useEffect) |
| 7 | Valid | Progressive loading for capable devices not implemented |
| 8 | Valid | Error handling not implemented |
| 9 | Valid | Canvas visibility ≠ Mapbox load event |
| 10 | Valid | T4 updated with description, not actual metrics; requires running test manually |
| 11 | Valid | All internal hooks mocked; wiring check only |
| 12 | Valid | FPS collected before/after pan, not during |
| 13 | Debatable | Low risk under Playwright defaults; fix anyway |
| 14 | Valid | Verbatim DRY violation |
| 15 | Valid | Test name describes implementation detail |
