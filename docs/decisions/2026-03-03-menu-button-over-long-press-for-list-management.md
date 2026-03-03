# ADR: Visible menu button over long-press for list management on touch devices

Date: 2026-03-03

## Decision

Use a visible `⋯` menu button (shown on touch devices via `@media (pointer: coarse)`) for Rename and Delete actions on list cards, rather than long-press gesture.

## Context

Users need to rename and delete their lists. On desktop, hovering a card reveals ✎ and 🗑 icons. On touch devices, we needed a discovery-friendly equivalent.

## Alternatives Considered

- **Long-press gesture**: Mobile-native feel, no extra UI chrome.
  Rejected: On iOS Safari, long-press is hijacked by the browser for text selection and native context menus. Custom long-press requires suppressing the native behavior, handling touch-cancel events, and managing timing precisely. This is known to be unreliable in production — especially on CafeRoam's target market (iOS users in Taiwan). `react-use-long-press` mitigates some issues but not all.

- **Swipe-to-reveal actions**: Standard iOS list pattern (mail, calendar). Familiar.
  Rejected: The `/lists` page is not a full-screen list; cards are in a scrollable page that also contains a map. Swipe-to-reveal conflicts with the page's own vertical scroll gesture on short lists.

- **Visible `⋯` menu button (chosen)**: Always discoverable; no gesture ambiguity. Renders only on `@media (pointer: coarse)`.

## Rationale

Reliability over cleverness. The `⋯` pattern is universally understood, eliminates gesture conflicts, and works identically across iOS Safari, Chrome Mobile, and Samsung Internet. The minor visual trade-off (always-visible icon vs. gesture-revealed action) is acceptable given the maximum-3-list constraint means cards are sparse.

## Consequences

- Advantage: Works reliably across all mobile browsers with zero gesture handling code.
- Advantage: Actions are always discoverable — no hidden gesture required.
- Disadvantage: Slightly more visual chrome on mobile vs. desktop (always-visible ⋯ vs. hover-revealed icons).
