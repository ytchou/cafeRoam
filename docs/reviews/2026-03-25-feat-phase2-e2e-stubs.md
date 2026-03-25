# Code Review Log: feat/phase2-e2e-stubs

**Date:** 2026-03-25
**Branch:** feat/phase2-e2e-stubs
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (20 total)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Critical | `e2e/feed.spec.ts:51-52` | Dead skip: `expect(likeButton).toBeVisible()` throws before `test.skip` fires — graceful skip is unreachable on empty feed | Bug Hunter, Architecture |
| 2 | Critical | `e2e/search.spec.ts:102-108` | Vacuous assertion: `isActive \|\| page.url().length > 0` is always `true` — WiFi filter behavior is never actually verified | Bug Hunter, Test Philosophy |
| 3 | Critical | `e2e/profile.spec.ts:82-133` | J38 runs deletion flow against shared test account; if cancel step fails mid-flow, all subsequent `authedPage` tests break | Architecture, Bug Hunter |
| 4 | Important | `e2e/checkin.spec.ts:90-94` | Async stamp write: `waitForLoadState('networkidle')` doesn't guarantee stamp is persisted; baseline count may be 0 when first stamp isn't yet visible — `secondCount > firstCount` can pass vacuously | Bug Hunter |
| 5 | Important | `e2e/checkin.spec.ts` (stamp locator) | CSS comma-scoping: `[class*="stamp"]` is unscoped — matches any element with "stamp" in its class on entire page, inflating stamp count | Architecture |
| 6 | Important | `e2e/discovery.spec.ts:94-97` | `.or()` + `.first()` on heterogeneous locators may resolve to wrong element (carousel vs shop name text) — shop detail panel assertion is unreliable | Bug Hunter |
| 7 | Important | `e2e/discovery.spec.ts:206-211` | Distance comparison strips units: `0.9 km` vs `800 m` gives `parse()` values `0.9` and `800` — sort order assertion passes when shops are NOT sorted by proximity | Bug Hunter |
| 8 | Important | `e2e/lists.spec.ts:112` | Overly broad `div` selector for `listCard` — matches all ancestor `<div>`s containing list name; `.first()` resolves to outermost wrapper, not the card | Bug Hunter |
| 9 | Important | `e2e/lists.spec.ts` (J27) | No cleanup on failure path: leaked list from J27 failure can put account at unexpected count, causing J13 3-list cap test to give false pass | Architecture |
| 10 | Important | `e2e/fixtures/auth.ts` | Per-test context + single `user.json` write target: race condition in parallel local runs (Playwright default: half CPU cores) | Architecture |
| 11 | Important | `e2e/checkin.spec.ts:18,55,75,116,156; e2e/discovery.spec.ts:78,108,142,223,261,289; e2e/lists.spec.ts:144; e2e/pwa.spec.ts:22` | Unsafe `[0]` array indexing violates CLAUDE.md rule: "Never use unsafe `[0]` array indexing. Use the project's `first()` helper function instead." | Standards |
| 12 | Important | `e2e/lists.spec.ts:11,56,69,106,151; e2e/profile.spec.ts:65` | Placeholder-style test data: `E2E Test List`, `Cap Test`, `Over Limit`, `Delete Test`, `Remove Shop Test`, `Tester` — violates CLAUDE.md "Realistic test data" rule | Standards, Test Philosophy |
| 13 | Important | `e2e/lists.spec.ts, e2e/search.spec.ts, e2e/pwa.spec.ts, e2e/edge-cases.spec.ts` | Scope creep: 4 extra spec files modified (J04, J17, J20, J24–J27, J30) beyond the 6 planned journeys — untracked in TODO.md and plan | Plan Alignment |
| 14 | Minor | `e2e/discovery.spec.ts:170-176` | `toHaveAttribute('data-active')` with no value arg checks attribute existence only — `data-active="false"` passes the assertion | Bug Hunter |
| 15 | Minor | `e2e/feed.spec.ts:90-91` | Hard-coded Tailwind CSS selector for feed cards — silently breaks on any style refactor | Bug Hunter |
| 16 | Minor | `e2e/explore.spec.ts:43-47` | `test.skip()` inside `if` block after `await` — may not halt execution in all Playwright versions; code after block continues on empty state | Bug Hunter |
| 17 | Minor | `e2e/discovery.spec.ts:61` | `'coffee'` as search term — unrealistic for Taiwan-targeted app; prefer `'咖啡'` | Standards |
| 18 | Minor | `e2e/discovery.spec.ts` (J28) | Viewport override in mobile project — sets `1280×800` but keeps mobile UA; hybrid state never represents a real device | Architecture |
| 19 | Minor | `e2e/pwa.spec.ts:4` | Test name reads as `GET endpoint returns JSON` rather than a user/installability outcome | Test Philosophy |
| 20 | Minor | `e2e/checkin.spec.ts:111` | `'...succeeds'` test name framing is signature-adjacent; prefer outcome framing | Test Philosophy |

### Validation Results

| # | Classification | Evidence |
|---|---------------|----------|
| 1 | Valid | `expect().toBeVisible()` at line 51 throws before `test.skip` at line 52 fires |
| 2 | Valid | `page.url()` always returns a non-empty string in Playwright |
| 3 | Valid | `authedPage` fixture used, no `afterEach`/`try/finally` cleanup after deletion initiates |
| 4 | Valid | Only `waitForLoadState('networkidle')` before reading stamp count — no explicit stamp-visible wait |
| 5 | Valid | CSS comma selector: `[class*="stamp"]` second part is unscoped, matches entire page |
| 6 | Valid | `.or()` combines mobile carousel locator with desktop text locator — ambiguous `.first()` resolution |
| 7 | Valid | `parse()` strips all units — `0.5 km` and `500 m` compare as `0.5 ≤ 500` (false order) |
| 8 | Valid | Bare `div` term in locator list matches all ancestor `<div>` elements containing list name |
| 9 | Debatable | Cleanup at line 202 runs at end of test body (not `afterEach`/`try/finally`) — leaks on failure |
| 10 | Valid | `user.json` written inside fixture body, not global setup — concurrent workers can race |
| 11 | Debatable | No TypeScript `first()` helper exists anywhere in the codebase — rule is aspirational |
| 12 | Valid | English placeholder strings (`E2E Test List`, `Over Limit`, `Tester`) confirmed |
| 13 | Debatable | Extra spec files confirmed in diff; tests are high quality but untracked in TODO |
| 14 | Debatable | `toHaveAttribute(name)` without value is correct for boolean HTML attributes |
| 15 | Debatable | Tailwind class chain — fragile on refactor but not currently broken |
| 16 | **Incorrect** | Playwright 1.58.2 (in use) — `test.skip()` inside test body throws `SkipError` correctly since 1.10 |
| 17 | **Incorrect** | "coffee" at line 61 is pre-existing J03 code not introduced by this branch |
| 18 | Valid | `setViewportSize(1280×800)` in J28 with no `isMobile` skip guard — mobile UA + desktop viewport |
| 19 | Valid | Test name reads as HTTP signature ("GET … returns") not user outcome |
| 20 | Debatable | "…succeeds" framing is functional but slightly signature-adjacent |

**Skipped (false positives):** #16 (Playwright 1.58 handles `test.skip` in `if` blocks), #17 (pre-existing code, out of scope)
