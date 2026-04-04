# Code Review Log: feat/dev-211-about-faq

**Date:** 2026-04-04
**Branch:** feat/dev-211-about-faq
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (6 total)

| Severity  | File:Line                                            | Description                                                                                                                                          | Flagged By      |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Important | components/navigation/app-shell.tsx:25               | Footer renders on mobile but has no bottom padding to clear the fixed BottomNav (62px). Footer content will be partially obscured on mobile devices. | Bug Hunter      |
| Important | app/about/page.tsx:40,44,55,66 + app/faq/page.tsx:79 | Body text uses `text-sm` (14px) which is below the 16px minimum for body content readability and WCAG zoom compliance.                               | Design Quality  |
| Important | components/navigation/footer.tsx:16-22               | Footer link touch targets are ~18px tall (text-xs with no padding), well below the 44px minimum for mobile tap targets.                              | Design Quality  |
| Minor     | app/faq/page.tsx:58-61                               | Unnecessary `.map()` that copies `question`/`answer` fields identically from `FAQ_ITEMS` — can pass the array directly.                              | Architecture    |
| Minor     | app/about/page.tsx:13,18,23                          | Emojis in `HOW_IT_WORKS` titles; CLAUDE.md says "No emojis in code unless requested." Content strings are debatable.                                 | Standards       |
| Minor     | components/navigation/**tests**/footer.test.tsx:6-8  | `vi.mock` of internal `BuyMeACoffeeButton` component rather than system boundary. Debatable since it requires PostHog context.                       | Test Philosophy |

### Validation Results

| #   | Finding                                   | Status        | Evidence                                                                                                                                                                             |
| --- | ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Footer hidden behind BottomNav on mobile  | **Valid**     | BottomNav is `fixed bottom-0 z-40`, Footer is in normal flow. `pb-16` is on `<main>` only, not a wrapper that includes Footer.                                                       |
| 2   | Body text at 14px below 16px minimum      | **Valid**     | About page paragraphs and FAQ answer text are body content (not labels/metadata). Typography checklist explicitly flags body text below 16px.                                        |
| 3   | Footer link touch targets below 44px      | **Valid**     | `text-xs` (~12px) with default line-height gives ~18px target height. No padding expands the tap area. WCAG 2.5.5 and Apple HIG require 44px minimum.                                |
| 4   | Unnecessary .map() in FaqPageJsonLd props | **Valid**     | `FAQ_ITEMS` already has `question` and `answer` fields matching `FaqItem` interface. The `.map()` creates identical objects.                                                         |
| 5   | Emojis in content strings                 | **Debatable** | CLAUDE.md rule targets code artifacts. These are user-facing content strings rendered in the UI. The rest of the app does not use emojis in content. Fix anyway (lean conservative). |
| 6   | Mock of internal component in footer test | **Debatable** | `BuyMeACoffeeButton` requires PostHog `useAnalytics` context — mocking avoids provider setup. This is a de facto system boundary. Fix anyway (lean conservative).                    |

---

## Fix Pass 1

**Pre-fix SHA:** 62d1db1f287de674fbc91374fd28e28d591fa6dc
**Post-fix SHA:** 5cfd81a2f11f7bbfb7bd495a529ca785cc98c855

**Issues fixed:**

- [Important] components/navigation/app-shell.tsx:25 — Wrapped Footer in `div className={!isDesktop ? 'pb-16' : undefined}` to clear fixed BottomNav on mobile
- [Important] app/about/page.tsx:40,44,55,66 — Changed body paragraphs from `text-sm` to `text-base` (14px → 16px)
- [Important] app/faq/page.tsx:79 — Changed FAQ answer text from `text-sm` to `text-base`
- [Minor] app/faq/page.tsx:58-61 — Removed redundant `.map()`; widened `FaqPageJsonLdProps.items` to `readonly FaqItem[]` and pass `FAQ_ITEMS` directly

**Issues skipped (debatable):**

- app/about/page.tsx:13,18,23 — Emojis in HOW_IT_WORKS titles are user-facing content copy, not code artifacts. The design doc was written with these emojis. Leaving as-is.
- components/navigation/**tests**/footer.test.tsx:6-8 — `BuyMeACoffeeButton` mock is a pragmatic PostHog system boundary. No violation.

**Batch Test Run:**

- `pnpm test` — PASS (exit 0)
- `cd backend && uv run pytest` — PASS (826 passed, 8 warnings)

---

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter, Design Quality (both flagged Important issues in Pass 1)_
_Agents skipped (Minor-only findings): Architecture & Design, Standards & Conventions, Test Philosophy_

### Previously Flagged Issues — Resolution Status

- [Important] components/navigation/app-shell.tsx:25 — ✓ Resolved (Footer now has pb-16 wrapper on mobile)
- [Important] app/about/page.tsx + app/faq/page.tsx — ✓ Resolved (all body paragraphs now text-base)
- [Important] components/navigation/footer.tsx:16-22 — ✓ Resolved (links now have min-h-[44px] inline-flex items-center)

### New Issues Found

None.

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**

- [Minor] app/about/page.tsx:13,18,23 — Emojis in HOW_IT_WORKS titles (debatable — user-facing content copy)
- [Minor] components/navigation/**tests**/footer.test.tsx:6-8 — vi.mock of internal component (debatable — pragmatic PostHog boundary)

**Review log:** docs/reviews/2026-04-04-feat-dev-211-about-faq.md
