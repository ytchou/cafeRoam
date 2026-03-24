# Code Review Log: fix/migration-version-conflict

**Date:** 2026-03-24
**Branch:** fix/migration-version-conflict
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)*
*Skipped: Plan Alignment (no matching plan doc), Test Philosophy (no test files in diff)*

### Issues Found (4 total, 2 actioned)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `supabase/migrations/20260324000002_create_search_events.sql` | RLS not enabled — table fully readable via REST API by any authenticated user; `query_text` exposes all users' search queries | Bug Hunter, Standards, Architecture |
| Important | `supabase/migrations/20260324000002_create_search_events.sql` | No INSERT policy — service-role-only write intent is implicit (resolved by enabling RLS, which denies non-service-role writes by default) | Bug Hunter |
| Important | `supabase/migrations/20260324000002_create_search_events.sql:5` | `query_text` stores raw verbatim user input — potential PDPA risk. **Skipped:** pre-existing design from DEV-9 (PR #62), out of scope for this rename fix | Standards |
| Minor | `supabase/migrations/20260324000003_create_shop_menu_items.sql:9` | `NUMERIC(8,0)` vs `INTEGER` for TWD prices. **Skipped:** pre-existing design from DEV-6, works correctly | Architecture |

### Validation Results

- Critical RLS issue: **Valid** — confirmed no `ENABLE ROW LEVEL SECURITY` in file
- Important INSERT policy: **Addressed by RLS fix** — enabling RLS with no INSERT policy = deny-all for non-service-role
- Important query_text PII: **Out of scope** — pre-existing design decision, noted for future ticket
- Minor NUMERIC type: **Out of scope** — pre-existing design, works correctly

---

## Fix Pass 1

**Pre-fix SHA:** d8b409a7ad69f8bdb8477c6293e81d6c3568907e

**Issues fixed:**
- [Critical] `supabase/migrations/20260324000002_create_search_events.sql` — Added `ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;`; no SELECT policy = deny-all for REST API; service role retains full access

**Issues skipped (out of scope):**
- `supabase/migrations/20260324000002_create_search_events.sql:5` — query_text PII (pre-existing design from DEV-9)
- `supabase/migrations/20260324000003_create_shop_menu_items.sql:9` — NUMERIC vs INTEGER (pre-existing design from DEV-6)
