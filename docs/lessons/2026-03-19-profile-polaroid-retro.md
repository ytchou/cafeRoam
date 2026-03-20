# Retrospective: Profile Polaroid

> PR: #49 — feat: Profile Polaroid — cork board stamp collection & memory space
> Merged: 2026-03-19
> Plan Doc: docs/plans/2026-03-19-profile-polaroid-redesign-plan.md
> Design Doc: docs/designs/2026-03-19-profile-polaroid-redesign.md

## Summary

Replaced the flat stamp passport with a polaroid-style memory system: a 2-column preview on the profile page and a full cork board at `/profile/memories` with scatter/grid toggle. All 9 planned tasks shipped clean. The pipeline caught a critical silent bug (wrong DB column name) that would have caused all diary notes to return null in production — the bug was introduced by a wrong assumption in the design doc that propagated through the plan into the test mock.

26 commits (+2,469/-351 lines, 27 files). 11 of those commits (42%) were `fix(review)` or `fix(ci)` rework.

## What Went Well

- **Wave structure held.** 4 waves (docs → backend/types → components → pages) executed without merge conflicts or ordering surprises. All 9 tasks completed as planned.
- **Code review caught the critical bug.** The `diary_note` column mismatch — a silent data corruption that would have served null diary notes to all users in production — was caught by `/code-review-and-fix` before merge. No user would have reported it directly; it would have looked like a feature "not implemented yet."
- **Deterministic scatter positioning.** Using a string hash from the stamp ID for rotation and position was a smart architectural decision — SSR-safe, no hydration mismatch, and visually consistent across reloads.
- **`makeStamp` factory paid off.** Having a realistic test factory meant that once `StampData` grew new fields, tests failed noisily at the type level rather than silently passing with undefined data.

## What Was Underestimated

- **11 of 26 commits were rework (42%).** The plan executed cleanly but left a significant cleanup surface for code review. This ratio is high. It suggests the plan-to-implementation gap could be tighter — particularly for standards compliance (no `SELECT *`, `first()` helper, `'use client'`) and dead-code hygiene.
- **Dead code cleanup was not in the plan.** The plan said "remove Lists tab" but did not include an explicit task to delete `lists-tab.tsx`, `use-list-summaries.ts`, and their test files. This was caught by code review, not the plan.
- **No accessibility checklist.** `PolaroidCard` launched without `role="button"`, `tabIndex`, or `onKeyDown`. Accessibility is not in CLAUDE.md's component checklist — it's caught only by code review when it matters.

## What Code Review Caught

| Issue                                                                                       | Severity  | Could the Plan Have Prevented It?                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diary_note` DB column doesn't exist (queried non-existent `diary_note`, schema has `note`) | Critical  | **Yes** — the design doc had the wrong column name; plan propagated it; a schema cross-reference step in the plan would have caught it                                           |
| Scatter X formula overflow on mobile (max left 64% + w-[42%] = 106%)                        | Important | **Partially** — the design doc specified `X: hash % (containerWidth - cardWidth)` but the implementation didn't follow the spec; plan should have flagged the formula explicitly |
| `SELECT *` instead of explicit columns                                                      | Important | **Yes** — CLAUDE.md rule, should be a plan template checklist item for any DB endpoint                                                                                           |
| `photo_urls[0]` instead of `first()` helper                                                 | Important | **Yes** — CLAUDE.md rule, same as above                                                                                                                                          |
| `StampDetailSheet` inline prop type duplicates `StampData`                                  | Important | No — architectural judgment call, appropriate for review to catch                                                                                                                |
| Dead code not deleted (`lists-tab`, `use-list-summaries`)                                   | Important | **Yes** — plan should have included "delete orphaned files" as a task                                                                                                            |
| `PolaroidCard` keyboard-inaccessible div                                                    | Important | **Yes** — accessibility should be a standard plan checklist item for new interactive components                                                                                  |
| Brittle mock chain in backend tests                                                         | Important | **Partially** — plan included TDD test code that used the same brittle chain; a testing-standards note in the plan would help                                                    |
| Missing `'use client'` on components with event handlers                                    | Minor     | **Yes** — CLAUDE.md / Next.js convention, checklist item                                                                                                                         |
| Emoji in production component                                                               | Minor     | **Yes** — CLAUDE.md rule ("no emojis unless requested")                                                                                                                          |
| localStorage key mismatch between design doc and code                                       | Minor     | **Yes** — design docs are often written early; the plan should note "verify localStorage key with implementation before finalizing"                                              |
| Space key missing `e.preventDefault()` on role=button                                       | Minor     | No — this is a subtle WAI-ARIA detail; appropriate for re-verify to catch                                                                                                        |
| Mock docstring overstated robustness                                                        | Minor     | No — documentation quality, appropriate for review                                                                                                                               |

## The Root Cause of the Critical Bug

The `diary_note` / `note` column mismatch originated in the **design doc** (`docs/designs/2026-03-19-profile-polaroid-redesign.md`), which stated: _"`diary_note` returns null if the `check_ins.diary_note` column does not yet exist."_ The design assumed a column named `diary_note` without cross-referencing the migration schema (where the column is `note`).

The plan doc faithfully reproduced this wrong name in the test mock code. When `/executing-plans` followed the plan's TDD test, the mock was written with `"diary_note": None` — a value the mock injected directly, so the test passed without ever querying the real DB column name. The bug was invisible to all automated checks until `/code-review-and-fix` compared the query string against the migration file.

**Lesson:** Mocks bypass query validation. A test that mocks the DB response can pass even if the underlying query would return zero rows in production.

## Scope Changes

| Change                                    | Direction | Reason                                                                       |
| ----------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `review_text` field in `StampDetailSheet` | Removed   | In design doc but not in plan; deferred to when diary check-in feature ships |
| Orphaned `lists-tab.tsx` + tests deleted  | Added     | Not in plan; caught by code review as dead code                              |
| `make_db_mock()` helper in backend tests  | Added     | Introduced by code review to address brittle mock chain pattern              |

## Pipeline Effectiveness

| Stage                | Effort                            | Issues Found                                        | Value                                                                                     |
| -------------------- | --------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| /writing-plans       | Medium (2 commits: design + plan) | 0 (introduced 1 critical bug via wrong column name) | High — structured 9-task wave execution perfectly; but plan propagated a design-doc error |
| /executing-plans     | High (9 feature commits)          | 0                                                   | High — clean execution, all tasks complete                                                |
| /code-review-and-fix | Medium (11 fix commits)           | 15 (1 Critical, 7 Important, 5 Minor + 2 re-verify) | High — prevented critical production bug; caught 7 Important issues in one pass           |
| /create-pr           | Low (2 style + 1 CI fix commit)   | 1 (ruff E501 line-length)                           | Medium — CI caught a simple formatter miss                                                |

**TDD verdict:** 0 bugs caught before code review. The plan specified TDD for the backend task (Task 1), but the TDD test was written using the wrong column name from the design doc — so the test passed on a mock that never validated the real query. TDD followed the wrong spec rather than catching the spec error. This is the same root cause as the critical bug.

## Deprecation Candidates

None flagged this feature. First observation for each:

| Stage                     | Flag                            | Recommendation                          | Cross-feature evidence |
| ------------------------- | ------------------------------- | --------------------------------------- | ---------------------- |
| /create-pr formatter step | ruff E501 was missed during dev | keep — CI catch is evidence it's needed | first observation      |

## Recommendations

**For next feature:**

- Add a schema cross-reference step to the backend plan template: _"Verify all DB column names used in JOIN selects against the latest migration file before writing tests."_
- Add to component plan template: _"Interactive components (clickable divs, cards) require `role`, `tabIndex`, and `onKeyDown` — do not leave for code review."_
- Add to plan template checklist: _"Delete orphaned files (components, hooks, tests) when removing a feature or tab."_
- Add a backend API endpoint plan checklist: _"No `SELECT _`. Use `first()`for array indexing.`'use client'` on any component with event handlers."\*

**For ERROR_PREVENTION.md:**

- Add: "DB column name masked by mock test" — when a plan/design doc specifies a DB column name, the test mock validates logic only, not the query. Cross-reference the migration schema explicitly.

**For CLAUDE.md:**

- Consider adding an interactive component standards section: _"Any component accepting `onClick` must include `role='button'`, `tabIndex={0}`, and `onKeyDown` (Enter + Space + `preventDefault`)."_
