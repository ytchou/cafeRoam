# Design: Mapbox GL JS Performance Validation + Graceful Degradation (DEV-75)

Date: 2026-03-30
Ticket: DEV-75 — Validate Mapbox GL JS performance on low-end Android (ASSUMPTION T4)

## Context

ASSUMPTION T4 ("Mapbox GL JS performs acceptably on low-end Android devices in Taiwan") has been unvalidated since project start. Taiwan's Android market includes budget devices (~2GB RAM) where Mapbox GL JS (~1.2MB minified, WebGL-based) can OOM-kill tabs or drop below usable frame rates.

Current state: the Find page loads the full interactive Mapbox map on all mobile devices. Dynamic imports and bounds-based pin filtering are in place, but there is no device capability detection or list-view fallback for low-end devices.

## Architecture

### Device Capability Detection

**New hook:** `lib/hooks/use-device-capability.ts`

- Reads `navigator.deviceMemory` (returns device RAM in GB, or `undefined`)
- Returns `{ isLowEnd: boolean, deviceMemory: number | undefined }`
- Threshold: `deviceMemory <= 2` → low-end
- `undefined` (Safari, Firefox — unsupported) → assume capable (safe default; these browsers handle WebGL better)

### Progressive Loading with MapWithFallback

**New component:** `components/map/map-with-fallback.tsx`

Rendering flow:
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
1. Always renders list view first (instant, zero bundle cost)
2. Checks `useDeviceCapability()`
3. **If capable:** starts background `import()` of `MapViewDynamic`, swaps to map view with a subtle fade transition once loaded
4. **If low-end:** stays on list view, shows a "載入地圖" (Load map) button. Tapping triggers the dynamic import and transitions to map view.
5. **On import failure:** inline error "地圖載入失敗" with retry button. List view remains functional.

The existing view toggle (地圖/列表) continues to work — this changes the **default view** for low-end devices only.

### Integration

`app/page.tsx` replaces direct map layout rendering with `MapWithFallback`. The component wraps the existing `MapMobileLayout`, `MapDesktopLayout`, `ListMobileLayout`, and `ListDesktopLayout` components.

### Data Flow

```
User opens Find page
  → MapWithFallback renders list view (immediate)
  → useDeviceCapability() checks navigator.deviceMemory
  → IF capable:
      → dynamic import MapViewDynamic in background
      → once loaded, fade transition to map view
  → IF low-end:
      → stay on list view
      → show "載入地圖" button
      → on tap: dynamic import → show map
  → IF import fails:
      → inline error + retry button
      → list view remains functional
```

## Components

<<<<<<< Updated upstream
| File                                   | Change                       | Size |
| -------------------------------------- | ---------------------------- | ---- |
| `lib/hooks/use-device-capability.ts`   | New                          | S    |
| `components/map/map-with-fallback.tsx` | New                          | M    |
| `app/page.tsx`                         | Modify — use MapWithFallback | S    |
=======
| File | Change | Size |
|------|--------|------|
| `lib/hooks/use-device-capability.ts` | New | S |
| `components/map/map-with-fallback.tsx` | New | M |
| `app/page.tsx` | Modify — use MapWithFallback | S |
>>>>>>> Stashed changes

## Error Handling

- Dynamic import failure: inline error with retry, list view stays functional
- `deviceMemory` API unavailable: assume capable (safe default)
- No new error boundaries needed — existing Suspense fallback handles loading state

## Performance Test Script

**New file:** `e2e/performance/map-perf.spec.ts`

Reusable Playwright script:
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
1. Creates CDPSession, throttles CPU 4x via `Emulation.setCPUThrottlingRate`
2. Throttles network to slow 4G (1.5Mbps down, 750Kbps up, 300ms RTT)
3. Navigates to Find page
4. Measures:
   - Time to first tile render (Mapbox `load` event)
   - FPS during programmatic pan/zoom (`requestAnimationFrame` timestamps)
   - JS heap memory (`performance.memory.usedJSHeapSize`)
5. Asserts acceptance criteria: tiles < 3s on 4G, pan/zoom > 30fps
6. Outputs to `e2e/reports/map-perf-{date}.json`

Run: `pnpm playwright test e2e/performance/map-perf.spec.ts`

## ASSUMPTION T4 Update

After running the performance script:
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
- **If passing:** T4 → "Validated" with test date, metrics, and link to report
- **If failing:** T4 → "Validated — FAILED" with metrics; note that graceful degradation is in place and mitigates the risk

## Alternatives Rejected

### Approach A: Hook-based gate at layout level
<<<<<<< Updated upstream

Simple `useDeviceCapability` check that prevents map import entirely on low-end devices. Rejected: abrupt — user sees list view with no transition. Approach B (progressive loading) gives a smoother UX where capable devices see the map load in naturally.

### Approach C: Server-side UA/Client Hints detection

=======
Simple `useDeviceCapability` check that prevents map import entirely on low-end devices. Rejected: abrupt — user sees list view with no transition. Approach B (progressive loading) gives a smoother UX where capable devices see the map load in naturally.

### Approach C: Server-side UA/Client Hints detection
>>>>>>> Stashed changes
Detect low-end devices via `Sec-CH-Device-Memory` headers at the server level. Rejected: Client Hints support is limited, UA sniffing is fragile and maintenance-heavy. Overkill for a client-side rendering decision.

## Testing Classification

- [ ] **New e2e journey?** No — no new critical user path. Find page map is already tested.
- [ ] **Coverage gate impact?** No — touches UI presentation logic, not a critical-path service.

## Sub-Issues

1. **DEV-107** — Create `useDeviceCapability` hook (Foundation, S)
2. **DEV-108** — Build `MapWithFallback` progressive loading component (M, blocked by DEV-107)
3. **DEV-109** — Create Playwright map performance test script (M)
4. **DEV-110** — Run performance validation + update ASSUMPTION T4 (S, blocked by DEV-109)
