# Code Review Log: feat/DEV-314-search-bar-revamp

**Date:** 2026-04-10
**Branch:** feat/DEV-314-search-bar-revamp
**Mode:** Pre-PR
**HEAD:** ebeff0d2352099d9cc30a5b0bad4ab61ec12221c

## Pass 1 — Full Discovery

_Agents: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy, Design Quality (inline — Opus single-session). Adversarial Review (Codex) was unavailable in this session._

### Issues Found (17 total)

| Severity  | File:Line                                                  | Description                                                                                                                             | Flagged By      |
| --------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Critical  | app/page.tsx:219-227                                       | Tag tokens push raw taxonomy_tags.id into filters[]; FILTER_TO_TAG_IDS uses short UI IDs → selected tags silently do not filter results | Bug Hunter      |
| Critical  | backend/api/search.py:109                                  | /search/suggest missing @limiter.limit — unauthenticated, per-keystroke DB query                                                        | Bug Hunter      |
| Important | app/page.tsx:65-66,101-110,269-272                         | Plan deviation — heroRef, IntersectionObserver, sticky wrapper div not removed per plan Task 1                                          | Plan Alignment  |
| Important | backend/api/search.py:111                                  | q has no max_length; interpolated into ilike                                                                                            | Standards       |
| Important | app/page.tsx:62,219-235                                    | tokens state duplicates filters[] instead of deriving from it; reload loses tokens                                                      | Architecture    |
| Important | lib/hooks/use-search-suggestions.ts:28-43                  | No request race protection (no AbortController)                                                                                         | Bug Hunter      |
| Important | lib/hooks/use-search-suggestions.ts:22-26                  | In-flight fetch not cancelled on cleanup → stale state writes                                                                           | Bug Hunter      |
| Important | components/discovery/search-suggestion-panel.test.tsx:5-11 | Mocks internal hook module — violates CLAUDE.md "mock at boundaries only"                                                               | Test Philosophy |
| Important | components/discovery/search-input-tokens.tsx:33            | Unsafe tokens[tokens.length - 1] — CLAUDE.md requires first()/safe access                                                               | Standards       |
| Important | backend/services/search_service.py:349-356                 | LIKE metacharacters in q not escaped (% \_ pass through)                                                                                | Bug Hunter      |
| Minor     | backend/api/search.py:115                                  | SearchService(embeddings=None) with type ignore — code smell                                                                            | Architecture    |
| Minor     | lib/hooks/use-search-suggestions.ts:5-8                    | SuggestTag interface triplicated; extract to lib/types                                                                                  | Architecture    |
| Minor     | components/discovery/search-input-tokens.test.tsx:6-35     | Test descriptions function-name framed, not user-journey                                                                                | Test Philosophy |
| Minor     | lib/hooks/use-search-suggestions.test.ts:40-44             | Real-clock setTimeout(400ms) — flaky                                                                                                    | Test Philosophy |
| Minor     | app/api/search/suggest/route.test.ts:4-14                  | Mocks internal @/lib/api/proxy; test is tautological                                                                                    | Test Philosophy |
| Minor     | components/discovery/search-suggestion-panel.tsx:76        | Hardcoded 🔍 emoji instead of lucide <Search />                                                                                         | Design Quality  |
| Minor     | components/discovery/search-suggestion-panel.tsx:44,53     | Chip contrast (white/20 on #3d2314) near WCAG AA boundary                                                                               | Design Quality  |

### Validation Results

All 17 findings validated inline (Opus, single-pass, Phase 4). 14 marked `valid`, 3 marked `debatable` (fix-anyway per conservative policy):

- `backend/api/search.py:115` — type ignore code smell (debatable)
- `lib/hooks/use-search-suggestions.test.ts:40-44` — fake-timers alternative is better but not required (debatable)
- `app/api/search/suggest/route.test.ts:4-14` — acceptable given route is a one-liner (debatable)
- `components/discovery/search-suggestion-panel.tsx:44,53` — contrast ratio borderline; needs DesignQuality follow-up (debatable)

3 potential findings skipped as false positives:

- `components/discovery/search-bar.test.tsx` gutted coverage → actually covered elsewhere
- `_CURATED_COMPLETIONS` linear scan → O(10), not a perf issue
- Layout shift between empty/typing states → intentional per design doc

## Notes

**Codex adversarial review unavailable** — codex CLI in this environment does not accept `adversarial-review` subcommand; Skill-tool dispatch disabled. Findings above are from inline single-session review only; a second-opinion adversarial pass could still uncover additional issues before merge.

**Top priority:** Critical finding #1 (tag token filter schema mismatch) breaks the core feature end-to-end — tag chips visibly appear but do nothing. Must be fixed before merge.

**Plan deviation severity:** Handoff note confirms Option A (delete old sticky tests + clean page.tsx) is the intended path. Recommend executing it.

## Pass 2 — Re-Verify (Iteration 1)

_Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy, Design Quality_
_Agents skipped (Minor-only): none_

### Previously Flagged Issues — Resolution Status

- [Critical] app/page.tsx:219-227 — ✓ Resolved
- [Critical] backend/api/search.py:109-116 — ✓ Resolved
- [Important] app/page.tsx:65-66,101-110,269-272 — ✓ Resolved
- [Important] backend/api/search.py:111 — ✓ Resolved
- [Important] app/page.tsx:62,219-235 — ✓ Resolved
- [Important] lib/hooks/use-search-suggestions.ts:28-43 — ✓ Resolved
- [Important] lib/hooks/use-search-suggestions.ts:22-26 — ✓ Resolved
- [Important] components/discovery/search-suggestion-panel.test.tsx:5-11 — ✓ Resolved
- [Important] components/discovery/search-input-tokens.tsx:33 — ✓ Resolved
- [Important] backend/services/search_service.py:349-356 — ✓ Resolved
- [Minor] backend/api/search.py:115 — ✓ Resolved
- [Minor] lib/hooks/use-search-suggestions.ts:5-8 — ✓ Resolved
- [Minor] components/discovery/search-input-tokens.test.tsx:6-35 — ✓ Resolved
- [Minor] lib/hooks/use-search-suggestions.test.ts:40-44 — ✓ Resolved
- [Minor] app/api/search/suggest/route.test.ts:4-14 — ✓ Resolved
- [Minor] components/discovery/search-suggestion-panel.tsx:76 — ✓ Resolved
- [Minor] components/discovery/search-suggestion-panel.tsx:44,53 — ✓ Resolved

### New Issues Found (0)

None.

### Batch Test Run

- `pnpm test` — PASS (1259/1259)
- `cd backend && uv run pytest -q` — PASS (970/970)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-10-feat-DEV-314-search-bar-revamp.md
