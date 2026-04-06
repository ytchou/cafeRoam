# DEV-263: Submit CTA Discoverability — Design

**Date:** 2026-04-06
**Status:** Approved
**Ticket:** [DEV-263](https://linear.app/ytchou/issue/DEV-263)

## Context

The `/submit` route exists and is functional under the `(protected)` route group, but the only entry point is a link on the FAQ page (added in DEV-250). Users have no way to discover shop submission from normal navigation flows.

## Design Decisions

- **Strategy:** Moderate push — 3 placements, visible to all users (unauth users hit login redirect via protected route)
- **Copy framing:** "推薦咖啡廳" (contributor/community framing) consistently across all CTAs
- **No new component files:** All changes inline in existing files

### Touchpoints

| Location              | Component                                 | Pattern                                                                               |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| **Footer**            | `components/navigation/footer.tsx`        | Append to `FOOTER_LINKS` array — renders automatically                                |
| **Home page banner**  | `components/discovery/discovery-page.tsx` | `bg-surface-warm` strip between hero and mode chips with brand pill button            |
| **Search no-results** | `components/discovery/discovery-page.tsx` | Inline text link below existing "no results" message, only when `isSearching` is true |

### Analytics

All CTAs tracked via existing `trackSignupCtaClick(ctaLocation)`:

- Footer: N/A (static link, no JS handler)
- Home banner: `'home_submit_cta'`
- Search no-results: `'search_no_results_submit_cta'`

## Alternatives Rejected

| Option                   | Reason                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Bottom nav placement** | DEV-225 already updating to 5 tabs — 6 would be too crowded on mobile          |
| **Auth-only visibility** | Limits discoverability for new visitors. Login redirect is acceptable friction |
| **Desktop header link**  | Header already has 5 nav items. Footer covers persistent availability          |
| **Explore empty state**  | Search no-results is higher-intent moment                                      |
| **"新增店家" copy**      | Admin/builder framing doesn't match CafeRoam's community vibe                  |

## Testing Classification

- [x] No — no new critical user path (e2e)
- [x] No — no critical-path service touched (coverage gate)

## Components Touched

| File                                              | Change                                   |
| ------------------------------------------------- | ---------------------------------------- |
| `components/navigation/footer.tsx`                | +1 entry to `FOOTER_LINKS` array         |
| `components/discovery/discovery-page.tsx`         | +home banner CTA, +search no-results CTA |
| `components/discovery/discovery-page.test.tsx`    | +2 test cases                            |
| `components/navigation/__tests__/footer.test.tsx` | +1 test case                             |
| `SPEC.md`                                         | §9 auth wall addendum                    |
| `SPEC_CHANGELOG.md`                               | Log entry                                |

## SPEC Impact

SPEC §9 auth wall needs a note that public-facing CTAs link to `/submit` with login redirect for unauth users. This is a documentation clarification, not a behavioral change.
