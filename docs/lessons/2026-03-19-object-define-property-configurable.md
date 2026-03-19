# Object.defineProperty browser stubs require configurable:true in test files

**Date:** 2026-03-19
**Context:** Replacing `vi.mock('@/lib/hooks/use-media-query')` / `vi.mock('@/lib/hooks/use-geolocation')` with real browser API stubs in page tests
**What happened:** Stubs on `navigator.geolocation` and `window.matchMedia` were written with `writable: true` only. The re-verify pass caught that jsdom properties are often non-configurable by default — a second `Object.defineProperty` call on the same property in a different test file running in the same Vitest worker will throw `TypeError: Cannot redefine property`.
**Root cause:** jsdom initialises many browser globals as non-configurable. Without `configurable: true`, the property descriptor cannot be redefined.
**Prevention:** Always use both `writable: true, configurable: true` when stubbing browser APIs with `Object.defineProperty` in test files. Prefer `vi.stubGlobal()` when available since it handles cleanup automatically via `vi.unstubAllGlobals()`.
