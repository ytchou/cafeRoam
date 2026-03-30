# Code Review Log: feat/dev-76-prod-promotion

**Date:** 2026-03-30
**Branch:** feat/dev-76-prod-promotion
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)*
*Skipped: Plan Alignment (no plan doc found), Test Philosophy (no test files in diff)*

### Issues Found (12 total after deduplication)

| # | Severity | File | Description | Flagged By |
|---|----------|------|-------------|------------|
| 1 | Critical | smoke-test.sh:50 | `-f` flag suppresses curl write-out on 4xx/5xx — `actual_status` empty | Bug Hunter |
| 2 | Critical | runbook.md | No verification step for custom_access_token_hook after enabling | Architecture |
| 3 | Important | smoke-test.sh:53 | `head -n -1` not portable on macOS (BSD head) | Bug Hunter |
| 4 | Important | smoke-test.sh:60 | `jq` absence silently skips JSON assertions — false PASS on health | Bug Hunter, Architecture |
| 5 | Important | runbook.md Ph2 | Missing `EMAIL_FROM`, `SEARCH_CACHE_PROVIDER`, `SEARCH_CACHE_TTL_SECONDS`, `SEARCH_CACHE_SIMILARITY_THRESHOLD` | Architecture |
| 6 | Important | runbook.md Ph3/4 | Domain mismatch: Ph3 configures `caferoam.tw`, Ph4 Better Stack Web Health targets `caferoam.com` (never configured) | Architecture |
| 7 | Important | runbook.md Ph1 | Pre-push `db diff` comment says "should show no diff after push" — misleading (applies to post-push diff only) | Architecture |
| 8 | Important | runbook.md | Rollback table missing Supabase Auth Site URL misconfiguration scenario | Architecture |
| 9 | Important | smoke-test.sh | `/api/health` proxy check only verifies 200 — doesn't confirm Next.js → backend proxying | Architecture |
| 10 | Minor | smoke-test.sh:21 | `YELLOW` variable defined but never used | Bug Hunter |
| 11 | Minor | runbook.md Ph0 | Missing `jq` and `curl` as Phase 0 prerequisites | Architecture |
| 12 | Minor | runbook.md Ph1 | No step to verify Supabase Storage buckets exist in prod (not replicated by `db push`) | Architecture |

### Validation Results

- Finding 5 (Critical): `NEXT_PUBLIC_APP_URL` vs `APP_URL` → **Incorrect** — grep confirms no bare `APP_URL` in codebase
- All others: Valid or Debatable (fix anyway per lean-conservative policy)
- Standards agent: **Clean** — no CLAUDE.md violations found

---

## Fix Pass 1

**Pre-fix SHA:** d5c95a8f23dbe3fa9c4d463f16df732f5f5b3895

**Issues fixed:**
- [Critical] smoke-test.sh:50 — Removed `-f` from curl; status extraction now works on 4xx/5xx
- [Critical] runbook.md — Added JWT inspection step to verify custom_access_token_hook fires
- [Important] smoke-test.sh:53 — Replaced `head -n -1` with `sed '$d'` (macOS portability)
- [Important] smoke-test.sh:60 — Added hard `jq`/`curl` prerequisite guards at script top; removed conditional jq check
- [Important] runbook.md Ph2 — Added `EMAIL_FROM`, `SEARCH_CACHE_PROVIDER`, `SEARCH_CACHE_TTL_SECONDS`, `SEARCH_CACHE_SIMILARITY_THRESHOLD`
- [Important] runbook.md Ph3/4 — Renamed to "Custom Domains", added `api.caferoam.com` Railway setup, domain strategy note, fixed Web Health monitor to `caferoam.tw`
- [Important] runbook.md Ph1 — Fixed misleading `db diff` comment (was "no diff after push" on pre-push step)
- [Important] runbook.md — Added auth email misconfiguration row to rollback table
- [Important] smoke-test.sh:81 — Added `.status "ok"` JSON assertion to `/api/health` proxy check
- [Minor] smoke-test.sh:21 — Removed unused `YELLOW` variable
- [Minor] runbook.md Ph0 — Added `jq`, `curl`, `caferoam.com` DNS to prerequisites
- [Minor] runbook.md Ph1 — Added Supabase Storage bucket verification step

**False positives skipped:**
- Finding 5 (Critical → Incorrect) — `APP_URL` vs `NEXT_PUBLIC_APP_URL`: grep confirms only `NEXT_PUBLIC_APP_URL` used in codebase

**Batch Test Run:**
- No TypeScript or Python files changed — test suites skipped (docs + shell scripts only)

---

## Pass 2 — Re-Verify

*Agents re-run: Bug Hunter (new Critical found), Architecture (all resolved)*
*Agents skipped (clean in discovery): Standards*

### New Issue Found in Re-Verify

| Severity | File | Description | Flagged By |
|----------|------|-------------|------------|
| Critical | smoke-test.sh:53 | `_fail + return` inside `$(...)` — failure swallowed into subshell, FAIL not incremented | Bug Hunter |

### Fix Pass 2

**Issue fixed:**
- [Critical] smoke-test.sh:53 — Moved `||` handler outside `$(...)` so `_fail` runs in parent shell

### Pass 2 Re-Verify Results

All previously flagged issues: ✓ Resolved
New Critical from pass 1: ✓ Resolved
Architecture Issue 9 (/api/health JSON): ✓ Resolved in smoke-test.sh (re-verify agent checked wrong file)

---

## Final State

**Iterations completed:** 2
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-30-feat-dev-76-prod-promotion.md
