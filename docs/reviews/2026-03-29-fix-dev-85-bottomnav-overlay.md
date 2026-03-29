# Code Review Log: fix/dev-85-bottomnav-overlay

**Date:** 2026-03-29
**Branch:** fix/dev-85-bottomnav-overlay
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

*Note: Plan Alignment agent ran git diff from main worktree (on main branch) instead of the feature worktree — got empty diff. Finding discarded as git context error; all other agents confirmed implementation exists.*

### Issues Found (5 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | `components/map/map-mobile-layout.tsx:105` | Safe-area inset lost in embedded mode — parent container uses `pb-2` (8px) but `env(safe-area-inset-bottom)` on iPhone X+ is ~34px; BottomNav will be clipped by home indicator | Bug Hunter, Architecture |
| Important | `components/navigation/bottom-nav.test.tsx:67-69` | Test asserts CSS class names and inline style value — implementation detail assertions that break on any Tailwind refactor while preserving behavior | Standards, Architecture |
| Minor | `components/navigation/bottom-nav.tsx:14` | `= {}` default on React component props object — never exercised by JSX, misleadingly implies component can be called without arguments | Standards |
| Minor | `components/navigation/bottom-nav.tsx` | `embedded` prop name leaks caller context into component API — consider `fixed?: boolean` (default true) for a self-describing API | Architecture |
| Minor | `components/navigation/app-shell.tsx` | Implicit `pb-16` contract compensating for fixed BottomNav is undocumented — future devs modifying AppShell padding could silently reintroduce overlay bug | Architecture |

### Active Agents (flagged ≥1 issue)
- Bug Hunter
- Standards
- Architecture

### Agents With No Findings
- Test Philosophy — no violations found
- Plan Alignment — git context error (discarded)

### Validation Results

| Finding | Classification | Action |
|---------|---------------|--------|
| Important: Safe-area inset lost | Valid | Fix |
| Important: Test asserts CSS class names | Valid | Fix |
| Minor: `= {}` default on props | Debatable | Fix |
| Minor: `embedded` prop name | Debatable (opinionated) | Skip — design doc evaluated alternatives, both names reasonable |
| Minor: Undocumented AppShell contract | Debatable | Fix |

**Issues to fix:** 4 (2 Important, 2 Minor)
**Skipped (false positives/opinionated):** 1

## Fix Pass 1

**Pre-fix SHA:** df3d853c834e6d7478458328d5f28ce23c85e7fe

**Issues fixed:**
- [Important] `components/map/map-mobile-layout.tsx:105` — Added `style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}` to container div; restores safe-area inset awareness lost when BottomNav switched to embedded mode
- [Important] `components/navigation/bottom-nav.test.tsx:67-69` — Replaced `className.not.toContain()` assertions with `not.toHaveClass()` (more idiomatic Testing Library); removed `paddingBottom` style assertion (implementation detail)
- [Minor] `components/navigation/bottom-nav.tsx:14` — Removed misleading `= {}` default from props destructuring (never exercised by JSX)
- [Minor] `components/navigation/app-shell.tsx:16` — Added comment documenting the `pb-16` / fixed BottomNav contract

**Issues skipped:**
- `embedded` prop name — opinionated naming preference; design doc already evaluated alternatives

**Batch Test Run:**
- `pnpm test` (vitest) — PASS (1010 tests)

## Pass 2 — Re-Verify (Smart Routing)

*Agents re-run: Bug Hunter, Standards, Architecture*
*Agents skipped (no findings in previous pass): Test Philosophy*
*Agents skipped (Plan Alignment git context error in previous pass): Plan Alignment*

### Previously Flagged Issues — Resolution Status
- [Important] `components/map/map-mobile-layout.tsx:105` — ✓ Resolved
- [Important] `components/navigation/bottom-nav.test.tsx:67-69` — ✓ Resolved
- [Minor] `components/navigation/bottom-nav.tsx:14` — ✓ Resolved
- [Minor] `components/navigation/app-shell.tsx` — ✓ Resolved
- [Minor] `embedded` prop name — Skipped (opinionated naming preference)

### New Issues Found
None.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**
- [Minor] `components/navigation/bottom-nav.tsx` — `embedded` prop name leaks caller context (skipped — opinionated; design doc already evaluated alternatives)

**Review log:** `docs/reviews/2026-03-29-fix-dev-85-bottomnav-overlay.md`
