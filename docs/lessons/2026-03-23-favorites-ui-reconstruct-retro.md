# Retrospective: Favorites UI Reconstruct

> PR: #56 — feat: Favorites UI Reconstruct — lists overview, detail views, mini-map, and 3-list cap
> Merged: 2026-03-23
> Plan Doc: docs/plans/2026-03-23-favorites-ui-reconstruct-plan.md
> Design Doc: docs/designs/2026-03-23-favorites-ui-reconstruct-design.md

## Summary

Rebuilt the Favorites (`/lists`) feature from scratch — 9 new components, 2 SWR hooks, 2 page rewrites, and deletion of the old `ListCard`. Covers mobile and desktop overview layouts, mobile and desktop detail views, an interactive mini-map with per-list colored pins, a `CreateListDialog`, and full 3-list cap enforcement on both platforms.

17 commits, +4,232/−434 lines, 32 files. All 14 planned tasks completed. 4 commits were rework (24% rework rate — improved from profile-polaroid's 42%). Code review caught 4 Critical and 14 Important issues before merge; all were resolved in a single fix pass.

## What Went Well

- **Wave structure was clean.** 4 waves (docs → leaf components → layout components → pages → cleanup) executed without ordering surprises. Leaf components were truly independent in Wave 1; layouts waited on leaves in Wave 2; pages integrated everything in Wave 3. No merge conflicts, no wave-boundary gaps.
- **All 14 tasks completed as planned.** No deferred items, no scope additions beyond what code review required. The plan held.
- **Single fix pass resolved everything.** Despite 26 valid issues found, all 4 Critical and 14 Important were resolved in one batch commit. Re-verify confirmed all resolved with no regressions and only 3 new Minors introduced.
- **Coverage gates held.** CI reported 80.8% frontend / 89.2% backend — above thresholds. The test factories (`makeShop`, `makeList`, `makeListItem`) absorbed the new components without requiring new factories.
- **24% rework rate (down from 42%).** Profile-polaroid had 11 rework commits out of 26. This feature had 4 out of 17. The improvement is real, though the single `fix(review)` commit was still a large batch (16 files).

## What Was Underestimated

- **Desktop layout data flow was never specified in the plan.** The plan described `FavoritesDesktopLayout` with a sidebar showing shops per list, but did not specify where `shopsByList` would come from. The page passed `shopsByList={{}}` (always empty) and code review caught this as Critical C4. The fix was to simplify: remove `shopsByList` entirely and drive the sidebar from `list.items.length` directly — a better architecture, but one that should have been specified upfront.
- **window.prompt() crept in despite the plan saying dialog.** The plan explicitly called for a dialog-based create flow. Both layout components shipped with `window.prompt()` — the path of least resistance during implementation. A plan task that names the component (`CreateListDialog`) rather than describing the UX would have prevented this.
- **Design token drift on every component.** Five Minor issues (M4–M8) were design spec violations: wrong font family, inverted badge colors, wrong button color palette, missing pill style. The design doc existed and was consulted, but checking DESIGN.md was not a step in each component task — so implementation diverged from spec at the detail level.
- **Prettier CI gap.** Local `pnpm format:check` reported clean but CI flagged 20 files. The tool exited with error code 1 on the first run locally (false negative) and "ok" on the second. Running `npx prettier --write` before committing would have caught this. Added one unnecessary CI round-trip.

## What Code Review Caught

| Issue | Severity | Could the Plan Have Prevented It? |
|---|---|---|
| SWR race condition — `isLoading` from wrong hook, "List not found" flashes on direct nav | Critical | **Partially** — an integration test covering direct navigation to `/lists/[id]` would have caught this |
| Desktop delete/rename completely broken — handlers declared in props but never destructured | Critical | **Yes** — a test for desktop delete/rename would have failed immediately |
| Empty-string Mapbox token passed to raw `Map`, no SSR guard | Critical | **Yes** — the plan should have specified "use `MapViewDynamic`, not raw `react-map-gl`" |
| `shopsByList` hardcoded to `{}` at callsite — desktop shows 0 shops | Critical | **Yes** — plan should have specified the data flow for `shopsByList` explicitly |
| `handleRename` missing try/catch | Important | No — implementation omission, appropriate for review |
| Desktop 3-list cap not enforced — "+ New List" always visible | Important | **Yes** — cap enforcement was in scope; the plan task should have included it explicitly |
| BottomNav z-40 overlaps bottom sheet z-30 — dead tap zone | Important | **Yes** — a plan note that detail views should omit BottomNav would have prevented this |
| `mapPins` array reconstructed every render without `useMemo` | Important | **Yes** — CLAUDE.md perf rule; could be a checklist item in list-rendering tasks |
| Inline `shopsByList={{}}` object literal in render | Important | **Yes** — CLAUDE.md rule; same as above |
| Emoji `☕` in JSX — violates CLAUDE.md | Important | **Yes** — CLAUDE.md rule ("no emojis unless requested") appeared in profile-polaroid too |
| `window.prompt()` for list creation — untestable, violates presentational contract | Important | **Yes** — plan said dialog; implement the component named in the plan |
| Raw `react-map-gl` `Map` in detail layout — wrong style, no SSR guard | Important | **Yes** — plan should specify `MapViewDynamic` as the canonical map component |
| Uniform pin color — design requires per-list colored pins | Important | **Partially** — design doc specified colors; referencing DESIGN.md per-task would help |
| Mini-map pin tap does nothing — `onPinClick` not wired | Important | **Yes** — missing interactivity, a test that clicks a pin would have caught it |
| `fetchWithAuth` mocked instead of `global.fetch` boundary (×2 hooks) | Important | **Yes** — CLAUDE.md mock-at-boundaries rule; appeared in profile-polaroid too (**2nd occurrence**) |
| Unsafe `shops[0]` array access for map center | Important | **Yes** — CLAUDE.md rule (use `first()`); repeated from profile-polaroid |
| `extractDistrict` regex fails on non-city-prefixed addresses | Minor | No — edge case, appropriate for review |
| `ListDetailShop` type duplicated in two layouts | Minor | No — architectural housekeeping, appropriate for review |
| Count badge colors inverted from design spec | Minor | **Yes** — check DESIGN.md during implementation |
| h2 wrong font family and size | Minor | **Yes** — same as above |
| "+ New List" missing pill style | Minor | **Yes** — same as above |
| Bottom sheet static div vs vaul Drawer (plan specified vaul) | Minor | **Yes** — plan should name the specific library |
| Desktop "New List" button wrong color palette | Minor | **Yes** — check DESIGN.md |
| Placeholder `'list-new'` ID instead of UUID | Minor | **Yes** — CLAUDE.md realistic test data rule |
| `useRouter` inside layout component — navigation at wrong layer | Minor | No — architectural judgment, appropriate for review |

**False positives (2):** M10, M11 — reviewer misread partial test names; both were correctly user-framed.

## Scope Changes

| Change | Direction | Reason |
|---|---|---|
| `CreateListDialog` as a named component | Added | Plan said "dialog"; `window.prompt()` was initially implemented; review forced the named component |
| `shopsByList` prop concept | Removed | Code review redesign — desktop sidebar driven by `list.items.length` directly (simpler, correct) |
| `onViewList` prop on both layouts | Added | Required when `useRouter` was moved out of layout components to the page layer |

## Pipeline Effectiveness

| Stage | Effort | Issues Found | Value |
|---|---|---|---|
| /writing-plans | Low (plan was pre-built via Pencil) | 0 | High — wave structure held for all 14 tasks |
| /executing-plans | High (14 feature commits, 4,232 lines) | 0 (TDD caught no bugs) | High — all tasks delivered |
| /code-review-and-fix | Medium (1 fix pass, 1 re-verify) | 26 unique valid issues | Very high — 4 Critical + 14 Important caught |
| /create-pr + CI | Low | 1 CI fix (prettier) | Medium — one unnecessary round-trip |

**TDD verdict:** Caught 0 bugs before code review (2nd feature in a row). Tests were structurally correct and mocked at boundaries, but they didn't expose wiring bugs (broken handler props, dead callsite data) because each component test was isolated. Integration-level bugs require integration tests.

## Recurring Patterns (Cross-Feature)

These appeared in both `profile-polaroid` and `favorites-ui-reconstruct`:

| Pattern | Evidence | Action |
|---|---|---|
| Mock-at-wrong-boundary (internal module instead of `global.fetch`) | I12, I13 here; brittle mock chain in profile-polaroid | Add to ERROR_PREVENTION.md |
| Emoji in production JSX | I6 here; same in profile-polaroid | Already in CLAUDE.md, but not surfacing during implementation |
| TDD catches 0 bugs (0/2 features) | Both features | TDD is covering behavior correctly but missing wiring integration |
| Design token drift (implementation diverges from DESIGN.md) | M4–M8 here; localStorage key mismatch in profile-polaroid | Add "check DESIGN.md" as a per-component task step |

## Deprecation Candidates

| Stage | Flag | Recommendation | Cross-feature evidence |
|---|---|---|---|
| None | — | — | — |

All pipeline stages demonstrated value on this feature. No deprecation candidates.

## Recommendations

**For next feature:**
- When a plan task involves a layout or page receiving data from a hook, name the hook and specify the prop type in the task description. "Desktop layout receives `pins: Pin[]` from `useListPins()`" prevents dead-prop bugs.
- Name the specific component for dialog/modal tasks in the plan (e.g., "Add `CreateListDialog` component"). "Add dialog" is too vague and invites `window.prompt()` shortcuts.
- Add a step to each component task: "Cross-check rendered values against DESIGN.md token table before committing." Five Minor design-token violations were all preventable.
- Run `npx prettier --write` (not `format:check`) as the pre-commit formatter. `format:check` gave a false negative locally and caused one CI round-trip.
- Add an integration test for any page that uses multiple SWR hooks — specifically, test the state when one hook is loading and the other has returned data.

**For ERROR_PREVENTION.md:**
- Mock boundary violation is now 2/2 features. Add entry: symptom = "mock of `@/lib/api/fetch` or internal wrapper instead of `global.fetch`", cause = "wrapper hides HTTP boundary", prevention = "always mock at `global.fetch` + `supabase.auth.getSession`".

**For CLAUDE.md:**
- Add to the pre-commit checklist: "Run `npx prettier --write .` (not `format:check`) to fix formatting before pushing."
