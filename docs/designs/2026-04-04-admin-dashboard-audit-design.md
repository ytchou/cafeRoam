# Admin Dashboard Audit — Ops-grade+ Hardening Design

**Date:** 2026-04-04
**Ticket:** [DEV-199](https://linear.app/ytchou/issue/DEV-199)
**Status:** Approved

---

## Goal

Harden the admin dashboard before beta launch. Audit all 6 admin pages for WCAG A accessibility violations, UI consistency issues, and unmaintainable component size. Fix High and Medium severity items.

## Pages in Scope

- `/admin` — overview/home (Dashboard)
- `/admin/shops` — shop list + pipeline
- `/admin/shops/[id]` — shop detail
- `/admin/jobs` — jobs queue (Batch Runs, Raw Jobs, Scheduler tabs)
- `/admin/taxonomy` — taxonomy management
- `/admin/roles` — role management

## Quality Bar

**Ops-grade+** — not full user-facing quality, not minimal fixes. Target:

- Fix all WCAG 2.1 Level A keyboard/ARIA violations (blocking keyboard users)
- Migrate to shadcn components for consistent UI (Roles page is the reference)
- Extract monolith pages into maintainable sub-components
- Unify auth token pattern and fix known `Bearer null` bug

**Not in scope:** WCAG AA (contrast, resize), loading skeletons, pagination on taxonomy/roles, sortable columns on shops/jobs, logout button, breadcrumb UUID resolution.

## Issues Found (Audit)

### High Severity (blocking)

1. **Tab bars lack ARIA** — Dashboard and Jobs use hand-rolled tabs with no `role="tablist"`, `role="tab"`, `aria-selected`, or `role="tabpanel"`. WCAG 4.1.2 failure.
2. **Clickable table rows not keyboard-accessible** — 4 tables (Shops, BatchesList, BatchDetail, RawJobsList) use `onClick` on `<tr>` with no `tabIndex`, `role`, or `onKeyDown`. WCAG 2.1.1 failure.
3. **Monolith components** — Dashboard (595 lines, 14 useState) and Shops (870 lines, 15 useState) are unmaintainable.

### Medium Severity

4. **Missing `aria-label`** on 8+ form controls across Dashboard, Shops, BatchDetail, Shop Detail.
5. **Inconsistent shadcn usage** — Roles page uses shadcn Button/Dialog/styled table. Every other page uses raw HTML.
6. **Inconsistent table styling** — Roles has rounded border + bg-gray-50 headers. Other pages have plain tables.
7. **Inconsistent tab indicator** — Dashboard uses `border-black`, Jobs uses `border-blue-600`.
8. **Progress bars lack ARIA** — Shop Detail mode scores and tag confidence bars have no `role="progressbar"`.
9. **Auth token inconsistency** — Dashboard/taxonomy use `tokenRef`, Shops uses standalone `getAuthToken()`. The shops version has a known `Bearer null` bug on expired sessions.

## Architecture

**Pure frontend restructuring.** No backend or DB changes. No new API routes.

### 5-Layer Approach

1. **Foundation** — Install shadcn Table/Input/Select/Badge + create `useAdminAuth()` hook
2. **Extraction** — Dashboard → SubmissionsTab + ClaimsTab; Shops → FilterBar + ShopTable + ImportSection
3. **Migration** — Replace raw HTML with shadcn across all pages
4. **A11y** — Keyboard rows, form labels, progress bars, sortable header ARIA
5. **Verification** — Consistency grep pass, full test suite, type check, lint

### New Files

| File                                                    | Purpose                                                 |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `app/(admin)/admin/_hooks/use-admin-auth.ts`            | Unified auth — wraps Supabase `getSession()`, null-safe |
| `app/(admin)/admin/_lib/status-badge.ts`                | Shared status→Badge variant mapping                     |
| `app/(admin)/admin/_components/SubmissionsTab.tsx`      | Extracted from Dashboard                                |
| `app/(admin)/admin/_components/ClaimsTab.tsx`           | Extracted from Dashboard                                |
| `app/(admin)/admin/shops/_components/ShopFilterBar.tsx` | Extracted from Shops                                    |
| `app/(admin)/admin/shops/_components/ShopTable.tsx`     | Extracted from Shops                                    |
| `app/(admin)/admin/shops/_components/ImportSection.tsx` | Extracted from Shops                                    |
| `app/(admin)/admin/shops/_constants.ts`                 | Module-scope constants moved from Shops page            |
| `components/ui/table.tsx`                               | shadcn Table (installed)                                |
| `components/ui/input.tsx`                               | shadcn Input (installed)                                |
| `components/ui/select.tsx`                              | shadcn Select (installed)                               |
| `components/ui/badge.tsx`                               | shadcn Badge (installed)                                |

### Reference Pattern

**Roles page** (`app/(admin)/admin/roles/page.tsx`) is the reference for:

- shadcn `Button` + `Dialog` usage
- Table: `<div className="overflow-hidden rounded-lg border border-gray-200"><table ...>` wrapper
- `aria-label` on `<select>` elements
- `htmlFor`/`id` label associations

After the migration, all admin pages should look like the Roles page.

## useAdminAuth Hook

Replaces two divergent patterns:

```typescript
// Old pattern 1 (Dashboard, Roles): tokenRef
const tokenRef = useRef<string | null>(null);
// Set once in useEffect, can go stale after session expiry

// Old pattern 2 (Shops): getAuthToken()
async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null; // fetches fresh each time, but no error handling
}

// New unified hook
export function useAdminAuth() {
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      return session?.access_token ?? null;
    } catch {
      return null; // never throws, never returns 'null' string
    }
  }, []);
  return { getToken };
}
```

## A11y Fix Reference

| Fix                                                        | Files                                            | WCAG  |
| ---------------------------------------------------------- | ------------------------------------------------ | ----- |
| shadcn Tabs (built-in ARIA)                                | Dashboard, Jobs                                  | 4.1.2 |
| Keyboard rows (`tabIndex={0}`, `role="link"`, `onKeyDown`) | ShopTable, BatchesList, BatchDetail, RawJobsList | 2.1.1 |
| `aria-label` on form controls                              | Dashboard, Shops, BatchDetail, Shop Detail       | 4.1.2 |
| `role="progressbar"` + `aria-valuenow/min/max`             | Shop Detail                                      | 4.1.2 |
| `aria-sort` + keyboard on sortable `<th>`                  | Taxonomy                                         | 4.1.2 |
| `aria-label="Admin navigation"` on `<aside>`               | Layout                                           | 1.3.1 |

## Testing Classification

**(a) New e2e journey?**

- [x] No — admin is internal tooling, not a critical user journey.

**(b) Coverage gate impact?**

- [x] No — no critical-path service touched.

**Testing strategy:** All 9 existing admin test files must continue to pass. The `useAdminAuth` hook gets 3 unit tests (active session, null session, error). No new integration tests required — ops-grade+ bar.

## Sub-issues (Execution Order)

| Ticket  | Title                                                 | Size | Depends on       |
| ------- | ----------------------------------------------------- | ---- | ---------------- |
| DEV-230 | Install shadcn + useAdminAuth hook                    | S    | —                |
| DEV-231 | Extract Dashboard → SubmissionsTab + ClaimsTab        | M    | DEV-230          |
| DEV-232 | Extract Shops → FilterBar + ShopTable + ImportSection | M    | DEV-230          |
| DEV-233 | Migrate all pages to shadcn                           | L    | DEV-231, DEV-232 |
| DEV-234 | A11y fixes                                            | M    | DEV-233          |
| DEV-235 | Consistency pass                                      | S    | DEV-233, DEV-234 |

## Alternatives Rejected

- **Near user-facing quality (WCAG AA, loading skeletons)** — Too much scope for internal tooling pre-beta. Competes with homepage redesign timeline.
- **Just the 3 High-severity items** — Leaves Medium issues (inconsistent UI, missing labels) that accumulate tech debt.
- **Shared CSS classes only** — Partial fix that doesn't leverage existing shadcn investment and creates a parallel styling system.
- **Defer component extraction** — Extraction is the prerequisite for applying shadcn and a11y fixes cleanly; deferring makes the migration harder.
