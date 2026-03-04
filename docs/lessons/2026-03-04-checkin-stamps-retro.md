# Retrospective: Check-in System with Stamps

> PR: #19 — feat: check-in system with photo upload, stamps, and passport UI
> Merged: 2026-03-04
> Plan Doc: docs/plans/2026-03-04-checkin-stamps-plan.md
> Design Doc: docs/designs/2026-03-04-checkin-stamps-design.md

## Summary

Built the full V1 check-in & stamps feature in a single session: photo upload (1-3 photos, camera-first), stamp reveal toast, passport-style stamp collection grid on profile, and auth-gated check-in history on shop detail. All 10 planned tasks completed across 3 waves with 26 commits. Code review found 1 Critical + 6 Important + 4 Minor issues post-implementation, pointing to specific gaps in how the plan specifies Supabase storage semantics, SWR cache key requirements, and UI interaction detail.

---

## What Went Well

- **Clean 3-wave execution.** All 10 plan tasks completed without blockers or rework. The wave structure (infrastructure → components → pages → integration) prevented circular dependencies.
- **Architecture decision resolved pre-code.** The design doc captured the direct client upload vs. signed URL tradeoff in an ADR (`docs/decisions/2026-03-04-direct-client-upload-supabase-storage.md`). No mid-stream architecture debate.
- **`/simplify` provided early catches.** Running `/simplify` before `/code-review-and-fix` caught the parallel upload opportunity and SWR fetcher instability before formal review, slightly reducing review scope.
- **Full test coverage at PR.** All branch tests passed; 4 pre-existing unrelated failures unaffected. Tests accurately covered user journeys rather than implementation internals.
- **`/code-review-and-fix` caught a production-breaking bug.** The private bucket + `getPublicUrl()` mismatch (Critical) would have shipped silently — all photos would have returned 403 for everyone, but the URL structure is syntactically valid so no exception would surface.

---

## What Was Underestimated

- **Supabase bucket visibility model requires explicit reasoning in plans.** The plan specified `checkin-photos` as `public=false` (the safer default), but browser `<img>` tags cannot carry auth headers — any photo rendered in an `<img>` tag requires a public bucket or a fresh signed URL per render. This distinction requires a clear decision in the plan stage, not the implementation stage.

- **SWR keys need auth-state awareness when response shape differs.** `CheckInPhotoGrid` returns a completely different response shape for auth vs anon (full list vs. count + preview). Without `isAuthenticated` in the SWR key, the cache returned stale anon data post-login. The plan didn't mention this requirement at all.

- **UI interaction details need explicit plan specifications.** Stamp page indicator dots were implemented (setting state) but not wired to scroll. The design doc described dots visually but not their scroll behavior. Plan tasks involving pagination or paging UI should explicitly state: "clicking dot N scrolls container to position N."

- **File storage content-type/extension alignment.** The plan didn't mention that the file extension in the storage path must match the file's actual type. The implementation hardcoded `.webp`, creating a metadata mismatch for JPEG/PNG/HEIC files. Plans touching file upload should note: "preserve original file extension."

---

## What Code Review Caught

| Severity | Issue | Could Plan Have Prevented? |
|---|---|---|
| Critical | `checkin-photos` bucket `public=false` → 403 on all `<img>` renders | **Yes** — plan should specify bucket visibility rationale |
| Important | `URL.createObjectURL` called in render loop, never revoked (memory leak) | Partially — plan could say "memoize blob URLs" |
| Important | File extension hardcoded as `webp` regardless of actual MIME type | **Yes** — plan should say "preserve original extension" |
| Important | `photo_urls[0]` accessed without empty-array guard (IndexError risk) | No — defensive coding, not plan-level |
| Important | `limit` param uncapped (DoS/exfiltration risk) | Partially — plan could specify validation bounds |
| Important | Anon preview query fetches all rows without `.limit(1)` | Partially — plan could note query optimization for anon path |
| Important | SWR key omits `isAuthenticated` → stale anon cache post-login | **Yes** — plan should specify key requirements for auth-gated responses |
| Minor | Stamp page dots call `setCurrentPage` but don't scroll the container | **Yes** — plan should describe dot → scroll wiring |
| Minor | `StampData` interface duplicated in component + hook | No — implementation artifact |
| Minor | `handleFiles` allows the same file to be added twice | Partially |
| Minor | Stamp SVG missing from success toast (design doc specified it) | **Yes** — plan should mirror key design doc UI details |

**Root pattern:** ~5 of 11 issues trace directly to plan omissions about Supabase semantics, SWR key design, and UI interaction wiring. The plan was strong on _what_ to build but thin on implementation constraints.

---

## Scope Changes

| Change | Direction | Reason |
|---|---|---|
| `checkin-photos` bucket changed to `public=true` | Modified | Code review: `<img>` tags can't carry auth headers |
| Analytics events (`checkin_completed`, `profile_stamps_viewed`) | Deferred | Planned deferral — needs usage data first |
| Menu photo enrichment worker | Deferred | Planned deferral — DB trigger ready, worker separate task |

No unplanned scope was added. All deferrals were pre-planned.

---

## Pipeline Effectiveness

| Stage | Effort | Issues Found | Value |
|---|---|---|---|
| /brainstorming | medium | 0 (design captured, architecture decided) | high |
| /writing-plans | medium | 0 (10-task breakdown, 3 waves) | high |
| /executing-plans | high | 0 pre-implementation (2 caught by CI mid-impl) | high |
| /simplify | low | 3 (blob URL, parallel uploads, SWR fetcher) | medium |
| /code-review-and-fix | medium | 11 (1 Critical, 6 Important, 4 Minor) | high |
| /create-pr | low | 1 (prettier glob `[shopId]`) | medium |

**TDD verdict:** 0 logic bugs caught by TDD before code review. Two pre-review `fix:` commits were caught by CI linters (ruff line length, eslint any), not by tests. All 11 code review issues shipped through TDD undetected. Coverage is present but misses implementation-level correctness (memory management, content-type handling, auth-awareness of cache keys).

---

## Deprecation Candidates

| Stage | Flag | Recommendation | Cross-feature evidence |
|---|---|---|---|
| /simplify | Partial overlap with /code-review | keep — catches low-hanging fruit before the more expensive review | first observation |

No stages feel ceremonial. `/simplify` is marginally redundant with `/code-review-and-fix` but reduces the review's issue volume.

---

## Recommendations

**For next feature (plans):**
- Supabase Storage tasks: explicitly state bucket visibility (`public: true/false`) with rationale. If photos are rendered in `<img>` tags → must be `public: true`.
- SWR hook tasks: specify cache key composition, especially if the response shape differs by auth state.
- File upload tasks: specify "preserve original file extension from `file.name`."
- UI paging/carousel tasks: specify scroll wiring, not just state management.
- Mirror key design doc UI details (toast content, icon, copy) explicitly in the plan — don't assume the implementer will re-read the design doc for each detail.

**For ERROR_PREVENTION.md:**
- prettier `--write .` from project root mishandles Next.js `[param]` paths (bracket is a glob character). Always run `prettier --write "path/to/[param]/file.tsx"` with the explicit path when working in dynamic route directories.

**For CLAUDE.md / testing standards:**
- Consider adding a testing checklist item: "If the component SWR key determines response shape based on auth state, add a test that verifies the key includes auth state."
- Consider adding to plan template: "Supabase Storage: confirm bucket visibility matches the access pattern (`<img>` tag → public required; backend-only → private is fine)."
