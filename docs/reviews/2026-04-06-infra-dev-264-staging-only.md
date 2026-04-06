# Code Review Log: infra/dev-264-staging-only

**Date:** 2026-04-06
**Branch:** infra/dev-264-staging-only
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)_
_Adversarial Review (Codex): failed — skill unavailable (disable-model-invocation)_

### Issues Found (4 total)

| Severity  | File:Line                | Description                                                                                                                                           | Flagged By   |
| --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Important | Makefile:54              | `cut -d'=' -f2` truncates SERVICE_ROLE keys containing `=` padding — should be `-f2-` like the SUPABASE_URL line above                                | Bug Hunter   |
| Important | scripts/sync_data.py:480 | Localhost fallback `postgresql://postgres:postgres@127.0.0.1:54322/postgres` still present in restore subcommand — contradicts staging-only migration | Bug Hunter   |
| Important | ERROR-PREVENTION.md:240  | "Environment Debugging Loops" entry still references `127.0.0.1:54321` as the correct target — stale for staging-first                                | Bug Hunter   |
| Minor     | Makefile:32              | `setup` target runs `supabase db push` without checking if Supabase CLI is linked — will fail confusingly if link step was skipped                    | Architecture |

### Validation Results

| Issue                                   | File:Line                | Classification | Evidence                                                                                                                                                                    |
| --------------------------------------- | ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SERVICE_ROLE cut truncation             | Makefile:54              | **Valid**      | JWT keys contain `=` padding. Line 53 correctly uses `-f2-` for SUPABASE_URL but line 54 uses `-f2`. This is a pre-existing bug in a modified target.                       |
| sync_data.py localhost fallback         | scripts/sync_data.py:480 | **Valid**      | Makefile guards against missing DATABASE_URL, but direct script invocation (`uv run scripts/sync_data.py restore ...`) bypasses the guard and silently falls back to local. |
| Stale localhost reference               | ERROR-PREVENTION.md:240  | **Valid**      | File was modified in this diff. The "Environment Debugging Loops" entry was not updated to reflect staging-first model.                                                     |
| setup target db push without link check | Makefile:32              | **Debatable**  | The target prints a link hint before running db push. A check would be safer but the hint is visible. Fix anyway (lean conservative).                                       |

### Skipped (False Positives)

| File:Line                | Reason                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend/core/config.py:7 | Empty string default for `supabase_url` is consistent with existing pattern (other fields also default to empty). Backend fails at first Supabase call, which is adequate. |
| scripts/doctor.sh:80-81  | `apikey: placeholder` is pre-existing, works correctly for Supabase health check endpoints, and is standard practice.                                                      |

## Fix Pass 1

**Pre-fix SHA:** ffd7488687775f2cb9069ca50885c277bf827b17

**Issues fixed:**

- [Important] Makefile:54 — Fixed `cut -d'=' -f2` to `-f2-` for SERVICE_ROLE_KEY extraction
- [Important] scripts/sync_data.py:480 — Removed localhost fallback; `--target-url` now requires explicit value. Added None guard before `cmd_restore` call.
- [Important] ERROR-PREVENTION.md:240 — Updated stale `127.0.0.1:54321` reference to staging-first language
- [Minor] Makefile:32 — Added `.supabase/project-ref` existence check in `setup` target; exits with helpful message if not linked

**Commit:** 323363a fix(review): address review findings for staging-only migration

**Batch Test Run:**

- `pnpm test` — PASS (1237 tests)
- `cd backend && uv run pytest` — PASS (859 tests)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None
