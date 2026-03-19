# State that resets on open belongs in the child that mounts on open
**Date:** 2026-03-20
**Context:** FilterSheet stale-state bug found in map-view-ui-rebuild code review

**What happened:** `FilterSheet` held `selected` state initialized from `initialFilters` via a lazy `useState`. Because `FilterSheet` itself is never unmounted (it lives in all 4 layout components), the lazy initializer ran only once. When a user removed a filter via a quick-filter pill and then reopened the sheet, `selected` still reflected the old state — causing "re-apply" bugs.

Attempting to fix with `useEffect(() => { setSelected(...) }, [open, initialFilters])` was blocked by the `react-hooks/set-state-in-effect` ESLint rule.

**Root cause:** State that should reset on each open was owned by a component that never unmounts. The fix was architectural: move the state into the child component (`FilterContent`) that is mounted/unmounted on each open/close cycle.

**Prevention:** When a modal, sheet, or drawer has state that should be fresh on every open:
1. Check whether the component holding the state is always-mounted or conditionally-mounted.
2. If always-mounted, move the state into a child that mounts only when open (via `if (!open) return null` or portal-based rendering like vaul's `Drawer.Portal`).
3. Do NOT reach for `useEffect` to sync state from props — the lint rule `react-hooks/set-state-in-effect` blocks this for good reason (cascading renders). The architectural fix is always cleaner.
