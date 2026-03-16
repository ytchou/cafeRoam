# Code Review Log: feat/pwa-installable-app

**Date:** 2026-03-16
**Branch:** feat/pwa-installable-app
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)_

### Issues Found (5 total)

| Severity  | File:Line                           | Description                                                                                               | Flagged By                          |
| --------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Important | scripts/generate-pwa-icons.ts:49    | favicon.ico written as PNG bytes (magic bytes 89 50 4E 47) — mismatched file format                       | Bug Hunter, Architecture            |
| Important | app/**tests**/middleware.test.ts:40 | `/manifest.webmanifest` missing from public-routes it.each coverage                                       | Bug Hunter                          |
| Important | app/layout.tsx:48                   | `maximumScale: 1` disables pinch-to-zoom — WCAG 1.4.4 regression                                          | Bug Hunter, Standards, Architecture |
| Important | middleware.ts:13                    | Removed `// /api routes handle their own JWT auth via FastAPI` — cross-service architectural context lost | Standards                           |
| Minor     | package.json                        | Icon generator script not registered as a package.json script — undiscoverable                            | Standards, Architecture             |

### Validation Results

- Proceeding to fix: 5 valid issues (4 Important, 1 Minor)
- Skipped false positives:
  - `app/manifest.ts` missing `orientation`/`scope` — defaults are fine for Tier 1; YAGNI
  - Plan deviation (favicon consolidation into one function) — clean simplification, no behavioral difference
  - `width: 'device/width'` diff artifact — actual file has correct `device-width`

---

## Fix Pass 1

**Pre-fix SHA:** ff522488fe63e20bf43217a7f6894d6a48c3df32

**Issues fixed:**

- [Important] scripts/generate-pwa-icons.ts:27 — renamed `favicon.ico` → `favicon.png`; updated metadata type to `image/png` (commit: 0c15288)
- [Important] app/**tests**/middleware.test.ts:40 — added `/manifest.webmanifest` to public-routes it.each (commit: b0cb1ee)
- [Important] middleware.ts:13 — restored `// /api routes handle their own JWT auth via FastAPI` comment (commit: b0cb1ee)
- [Important] app/layout.tsx:48 — removed `maximumScale: 1` WCAG regression (commit: b03d7ec)
- [Minor] package.json — added `"generate:icons": "tsx scripts/generate-pwa-icons.ts"` script (commit: b03d7ec)

**Batch Test Run:**

- `pnpm test` — 553 PASS / 3 pre-existing failures in header-nav.test.tsx (Supabase env not set in worktree, unrelated to this branch)

---

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)_
_Agents skipped (Minor-only findings): Plan Alignment_

### Previously Flagged Issues — Resolution Status

- [Important] scripts/generate-pwa-icons.ts:27 — favicon.ico → favicon.png — ✓ Resolved
- [Important] app/**tests**/middleware.test.ts:40 — /manifest.webmanifest in test — ✓ Resolved
- [Important] middleware.ts:13 — FastAPI comment restored — ✓ Resolved
- [Important] app/layout.tsx:48 — maximumScale removed — ✓ Resolved
- [Minor] package.json — generate:icons script added — ✓ Resolved

### New Issues Found: 0

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-16-feat-pwa-installable-app.md
