# ADR: SWR hook with derived state maps over React Context provider for user lists state

Date: 2026-03-03

## Decision

Use a `useUserLists()` SWR hook with computed `savedShopIds: Set` and `listMembership: Map` rather than a global React Context provider.

## Context

The User Lists feature requires "is this shop saved?" state to be available on any shop card or shop detail page across the app. Multiple components in different parts of the component tree need this state simultaneously. We needed to decide how to source and share it.

## Alternatives Considered

- **React Context provider (`<UserListsProvider>`)**: Wraps the auth-protected layout. Fetches lists once at mount, stores in context. All children read from context via `useContext`.
  Rejected: Requires a Provider in the layout tree; no automatic cache invalidation, stale-while-revalidate, or background revalidation without building it manually. Optimistic rollback must also be hand-rolled.

- **Per-page data fetching (no shared state)**: Each page fetches its own lists. Simplest per-page reasoning.
  Rejected: Duplicate network calls; bookmark icon state is stale if user saves a shop on one page then navigates to another page that has already fetched its data.

- **SWR-based `useUserLists()` hook (chosen)**: Any component calling the hook gets the same cached data via SWR's automatic request deduplication — one network request total, shared across all callers. Optimistic updates with automatic rollback are first-class SWR features.

## Rationale

SWR is already in the stack. A shared SWR key means deduplication is free: 20 shop cards and a shop detail page can all call `useUserLists()` and SWR fires exactly one `GET /api/lists` request. The hook also exposes two derived structures computed from the same cached data — `savedShopIds` (for BookmarkButton) and `listMembership` (for SaveToListSheet checkbox state) — keeping both in sync without a Provider or additional fetches.

## Consequences

- Advantage: No Provider in layout tree; deduplication, revalidation, and rollback are handled by SWR.
- Advantage: Derived `savedShopIds` and `listMembership` Maps are always in sync — both computed from a single SWR cache entry.
- Disadvantage: Rapid mutations on the same `(listId, shopId)` pair must be serialized; SWR's rollback restores last server state, not a safe intermediate. This is a known risk documented in the design.
