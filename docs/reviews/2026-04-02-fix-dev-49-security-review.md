# Code Review Log: fix/dev-49-security-review

**Date:** 2026-04-02
**Branch:** fix/dev-49-security-review
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)_

### Issues Found (7 after validation)

| Severity  | File:Line                                 | Description                                                                                                  | Flagged By     |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------- |
| Critical  | middleware/rate_limit.py:6                | `get_remote_address` returns proxy IP in production — all users share one rate-limit bucket                  | Bug Hunter     |
| Important | backend/main.py:47-50                     | `_sentry_before_send` strips `event["user"]` but not Authorization header from `event["request"]["headers"]` | Bug Hunter     |
| Important | sentry.client.config.ts                   | `beforeSend` callback missing — plan Step 7 required it                                                      | Plan Alignment |
| Important | backend/services/profile_service.py:73-82 | `delete_owner_data()` docstring says "do not share FK cascade path" — now false after migration 000006       | Architecture   |

### False Positives Skipped

- `backend/api/submissions.py:44-45` — Architecture agent claimed decorator order was wrong. INCORRECT: documented slowapi pattern has `@router.post` on top and `@limiter.limit` below; current code matches exactly. Skipped.
- `backend/api/submissions.py:129` — Standards agent flagged `submitted_by` raw UUID in job payload as PDPA violation. DEBATABLE but pre-existing (commit 376f580e, 2026-02-25) and functionally necessary (worker uses it as FK). Low priority; not in scope for this PR.

### Validation Results

| #   | Finding                                           | Classification                        |
| --- | ------------------------------------------------- | ------------------------------------- |
| 1   | Decorator order inverts slowapi                   | INCORRECT — skip                      |
| 2   | `get_remote_address` returns proxy IP             | VALID — fix                           |
| 3   | `before_send` doesn't strip Authorization headers | DEBATABLE — fix (conservative)        |
| 4   | `submitted_by` UUID in job queue                  | DEBATABLE — pre-existing, skip        |
| 5   | `delete_owner_data()` docstring stale             | VALID — fix                           |
| 6   | `beforeSend` missing from client Sentry config    | VALID — fix                           |
| 7   | Application-level deletes now redundant           | VALID — docstring fix (covered by #5) |

---

## Fix Pass 1

**Pre-fix SHA:** d9e4c0d58d9df0b9c54c5543a69ef1b6fd04ec5c

### Fixes Applied

| Issue                                                    | Fix                                              | Commit  |
| -------------------------------------------------------- | ------------------------------------------------ | ------- |
| `get_remote_address` returns proxy IP                    | Switched to `get_ipaddr` (reads X-Forwarded-For) | 7975a0c |
| `_sentry_before_send` missing Authorization/Cookie scrub | Added `.pop()` for all 4 header variants         | cc10480 |
| `beforeSend` missing from frontend Sentry config         | Added hook + `sendDefaultPii: false`             | e2fdd51 |
| ESLint unused-vars on destructured headers               | Replaced with delete loop                        | d30d1e0 |
| `delete_owner_data()` docstring stale re: CASCADE        | Updated to reflect migration 20260402000006      | c5ffb3b |

### Test Results (post-fix)

- Backend: 787/787 passed
- Frontend: 1066/1072 passed (6 pre-existing failures, unrelated to this PR)

---

## Re-Verify Pass 1

**Agents:** Bug Hunter (Explore), Architecture (Explore), Plan Alignment (Explore)
**Diff:** `d9e4c0d..HEAD` (4 files, 34 insertions, 5 deletions)

### Results

| File                                  | Fix                                                                                              | Verdict  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| `backend/main.py`                     | Sentry hook registered, before_send passed to init(), strips Authorization + Cookie (both cases) | VERIFIED |
| `backend/middleware/rate_limit.py`    | Correctly switched to `get_ipaddr`, X-Forwarded-For aware                                        | VERIFIED |
| `backend/services/profile_service.py` | Docstring accurately reflects migration 20260402000006, no stale claims                          | VERIFIED |
| `sentry.client.config.ts`             | beforeSend hook added, sendDefaultPii=false, strips same headers as backend                      | VERIFIED |

**Cross-file consistency:** backend `_sentry_before_send` and frontend `beforeSend` strip identical header set (Authorization, authorization, Cookie, cookie) and both delete `event.user`. ✓

**New bugs introduced:** None.

**Overall: CLEAN — all fixes verified, no regressions.**
