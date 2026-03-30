# useSyncExternalStore for SSR-Safe Browser API Reads

**Date:** 2026-03-30
**Context:** DEV-75 Mapbox performance — `useDeviceCapability` hook reading `navigator.deviceMemory`

**What happened:**
The hook read `navigator.deviceMemory` synchronously during render with an SSR guard (`typeof navigator !== 'undefined'`). On the server, `isLowEnd` was always `false`; on a 2GB Android client, it was `true`. This caused a hydration mismatch on every low-end device load — the exact target population for the feature.

**Root cause:**
The SSR guard prevents the server crash but doesn't prevent the client/server mismatch: the server snapshot and client first-render value differ, triggering React's hydration warning.

**Prevention:**
For any hook that reads a browser-only API (`navigator.*`, `window.*`, `localStorage`, etc.) and returns a value that could differ between server and client:

1. Use `useSyncExternalStore` with an explicit `getServerSnapshot` that returns the safe default
2. The client snapshot is called after hydration, eliminating the mismatch
3. Memoize the client snapshot if the value never changes (e.g., `navigator.deviceMemory`) to prevent infinite re-renders
4. Export `_resetCache()` for test isolation when using a module-level cache

```ts
import { useSyncExternalStore } from 'react';

let clientSnapshot: T | null = null;

function getSnapshot(): T {
  if (clientSnapshot === null) {
    clientSnapshot = readBrowserAPI();
  }
  return clientSnapshot;
}

export function useMyHook(): T {
  return useSyncExternalStore(
    () => () => {}, // no subscription if value is static
    getSnapshot,
    () => SERVER_SAFE_DEFAULT
  );
}

export function _resetCache(): void {
  clientSnapshot = null;
}
```
