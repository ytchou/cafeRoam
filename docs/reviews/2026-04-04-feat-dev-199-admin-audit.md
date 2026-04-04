# Code Review Log: feat/dev-199-admin-audit

**Date:** 2026-04-04
**Branch:** feat/dev-199-admin-audit
**Mode:** Pre-PR

## Pass 1 -- Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (4 total)

| Severity  | File:Line                                              | Description                                                                                                                                                                               | Flagged By            |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Important | app/(admin)/admin/\_components/ClaimsTab.tsx:86-92     | Double useEffect on mount: first calls fetchClaims('pending'), second calls fetchClaims(claimStatusFilter) which is also 'pending' initially -- causes duplicate API calls on every mount | Bug Hunter            |
| Important | app/(admin)/admin/jobs/\_components/BatchesList.tsx:76 | Still uses createClient() directly instead of useAdminAuth hook -- inconsistent with the auth unification goal of this branch and retains the Bearer null bug risk on expired sessions    | Bug Hunter, Standards |
| Important | app/(admin)/admin/\_components/ClaimsTab.tsx:114-134   | handleClaimReject has no try/catch -- network errors will surface as unhandled promise rejections instead of showing a toast                                                              | Bug Hunter            |
| Minor     | app/(admin)/admin/\_components/ClaimsTab.tsx:269-278   | Claim rejection reasons are hardcoded inline while SubmissionsTab imports ADMIN_REJECTION_REASONS from a shared constant -- inconsistent pattern                                          | Architecture          |

### Validation Results

| Finding                               | Validation                                                                                              | Status    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- |
| ClaimsTab double useEffect            | Valid -- both effects fire on mount with identical args, causing 2 network requests                     | Valid     |
| BatchesList createClient              | Valid -- file was touched in DEV-233/DEV-234 commits but auth pattern was not migrated                  | Valid     |
| ClaimsTab missing try/catch           | Valid -- handleClaimReject makes a fetch without try/catch, unlike every other handler in the same file | Valid     |
| ClaimsTab hardcoded rejection reasons | Debatable -- minor consistency issue, current code works correctly. Fix anyway for consistency.         | Debatable |

### Skipped (0 false positives)

- Raw `<input type="checkbox">` in ShopTable.tsx and `<input type="file">` in ImportSection.tsx -- shadcn does not provide checkbox or file input components, so these are intentionally raw HTML. Not a standards violation.
