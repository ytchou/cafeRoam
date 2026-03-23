# Code Review Log: feat/error-states

**Date:** 2026-03-23
**Branch:** feat/error-states
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)*
*Skipped: Plan Alignment (no plan doc found), Test Philosophy (no test files in diff)*

### Issues Found (7 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `app/error.tsx:10` | `error` prop silently dropped — no Sentry capture, no console.error, digest discarded | Bug Hunter |
| Important | `tsconfig.json:17` | `vitest/globals` in root tsconfig leaks test globals into all source files | Architecture |
| Important | `components/ui/error-state.tsx:45`, `app/not-found.tsx:12` | Raw `<button>`/`<Link>` instead of Button primitive — missing focus-visible ring (a11y) and vertical centering | Architecture, Bug Hunter |
| Important | `components/ui/coming-soon.tsx:32`, `components/ui/error-state.tsx:34` | `tracking-tight` on CJK heading text violates DESIGN.md rule | Standards |
| Important | `app/not-found.tsx:15` | Incomplete font stack — missing `var(--font-noto-sans-tc)` and `system-ui` | Standards |
| Important | `components/ui/coming-soon.tsx:3-9`, `components/ui/error-state.tsx:3-9` | `HEADING_STYLE`/`BODY_STYLE` constants duplicated verbatim across both files | Architecture, Bug Hunter |
| Minor | `app/not-found.tsx` | CTA button rendered outside the ComingSoon card, visually disconnected | Architecture, Standards |

### Validation Results

All 7 issues validated. 0 false positives. All proceed to fix.

---

## Fix Pass 1

*(populated below)*
