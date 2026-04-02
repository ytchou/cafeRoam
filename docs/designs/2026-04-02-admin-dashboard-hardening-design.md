# Admin Dashboard Hardening — Design Doc

**Status:** Approved
**Date:** 2026-04-02
**Linear:** DEV-149 (parent), DEV-181–DEV-186 (sub-issues)
**Milestone:** Beta Launch

## Goal

Harden the admin dashboard with confirmation dialogs on all destructive actions, fix broken URL params, add claim history, build a full Roles management page, and make the Taxonomy page actionable — ensuring reliable beta ops without dropping into DB or Supabase UI.

## Architecture

All work extends existing admin pages (`app/(admin)/admin/`) and API proxy routes (`app/api/admin/`). A new reusable ConfirmDialog wrapper around shadcn AlertDialog provides consistent confirmation UX. The Roles page adds 2 new proxy routes + 1 new page following established patterns. Backend changes are limited to `admin_roles.py` (add `shop_owner` to valid roles, JOIN `auth.users` for email).

No new architectural patterns introduced. No new external dependencies beyond shadcn AlertDialog (radix-ui already present).

## Components

### A. ConfirmDialog (Foundation — DEV-181)

Reusable wrapper around shadcn AlertDialog at `app/(admin)/admin/_components/ConfirmDialog.tsx`.

Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel` (default "Confirm"), `variant` (default/destructive), `onConfirm` (async), `loading`.

Applied to all destructive/irreversible admin actions:

- **Dashboard**: Approve submission, Approve claim
- **Shops List**: Bulk Approve Selected, Bulk Approve All
- **Shop Detail**: Set Live, Unpublish (migrated from `window.confirm()`), Re-enrich, Re-embed, Re-scrape
- **Jobs**: Cancel (migrated from `window.confirm()`), Retry
- **Roles**: Revoke role
- **Taxonomy**: Re-enrich, Generate Embedding

Existing inline rejection patterns (dropdown + confirm) for submissions and claims are kept as-is — not migrated to AlertDialog.

### B. Jobs URL Param Fix (DEV-182)

`jobs/page.tsx` reads `useSearchParams()`. When `?status` is present, defaults to "Raw Jobs" tab and passes `initialStatus` prop to `RawJobsList`, which uses it as initial filter value.

### C. Claim History Filter (DEV-183)

Dashboard Claims tab gets a `claimStatusFilter` dropdown (pending/approved/rejected/all). Backend already supports `?status=` parameter. Status badge column added. Action buttons hidden for resolved claims.

### D. Roles Management Page (DEV-184)

Full `/admin/roles` page:

- Table: user email, role, granted date, revoke button
- Filter by role type dropdown
- "Grant Role" dialog (uses existing `Dialog` component): user ID/email input, role dropdown (blogger, member, partner, admin, shop_owner)
- Revoke with ConfirmDialog confirmation

Frontend proxy routes: `app/api/admin/roles/route.ts` (GET, POST), `app/api/admin/roles/[userId]/[role]/route.ts` (DELETE).

Backend changes:

- `_VALID_ROLES` expanded to include `shop_owner`
- `list_roles` updated to JOIN `auth.users` for email resolution

### E. Taxonomy Action Buttons (DEV-185)

Low-confidence shops get "Re-enrich" button. Missing-embedding shops get "Generate Embedding" button. Both reuse existing `POST /api/admin/shops/{id}/enqueue` endpoint. Per-button loading state via `Set<string>`. ConfirmDialog before each action.

### F. Dead-Letter Audit (DEV-186)

Already covered by `dead_letter` status filter in RawJobsList. Dedicated route retained with clarifying comment. No UI changes.

## Data Flow

No new data flows. All actions use existing API proxy → FastAPI backend pattern.

## Error Handling

All confirmable actions use existing try/catch + toast notification pattern. ConfirmDialog stays open on error (closes only on success). Roles grant/revoke failures show toast with error detail.

## Key Decisions

| Decision              | Chosen                       | Alternative Rejected        | Why                                                  |
| --------------------- | ---------------------------- | --------------------------- | ---------------------------------------------------- |
| Confirmation UX       | shadcn AlertDialog           | `window.confirm()`          | Consistent styled UI, accessible, blocks interaction |
| shop_owner in Roles   | Include in `_VALID_ROLES`    | Keep separate (claims-only) | Admin needs manual grant/revoke for edge cases       |
| User display in Roles | Backend JOIN for email       | Ship with user_id only      | Better UX, one-time backend change                   |
| Admin route guard     | Already exists in middleware | n/a                         | Discovered during audit — gap #8 eliminated          |

## Testing Classification

- [ ] No — no new critical user path (admin dashboard is internal tooling)
- [ ] No — no critical-path service touched (search, checkin, lists unaffected)

## Testing Strategy

- Unit test for ConfirmDialog component
- Update all existing page tests to click through confirmation dialogs (AlertDialog renders in portal → use `screen.findByRole('alertdialog')`)
- New test file for Roles page (CRUD, confirmation on revoke)
- Taxonomy test updates for action buttons
- Backend test for `shop_owner` in valid roles and email resolution
