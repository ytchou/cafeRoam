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

*(Populated after fixes)*
