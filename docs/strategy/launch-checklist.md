# Launch Readiness Checklist (DEV-68)

Last audit: 2026-04-01
Milestone: Beta Launch

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Verified green |
| ❌ | Issue found — fix required |
| ⚠️ | Known gap — accepted risk |
| 🔧 | Fixed in this audit cycle |
| ⏳ | Ops task — manual step required |

---

## 1. RLS Policy Audit

All user-facing tables must have RLS enabled and correct policies before beta.

| Table | RLS Enabled | Policies | Notes |
|-------|-------------|----------|-------|
| `shop_followers` | ✅ | Public read; users INSERT/DELETE own rows | |
| `shop_submissions` | ✅ | Users SELECT/INSERT own rows only | |
| `community_note_likes` | ✅ | Users INSERT/DELETE own; public SELECT | |
| `user_roles` | ✅ | Enabled, no policies | Service role only — intentional |
| `search_cache` | ✅ | No RLS | Internal system table, no anon key access |
| `shop_claims` | ✅ | Users read/insert own claim | Admin manages status via service role |
| `shop_content` | ✅ | Owner manage; public read published | |
| `shop_owner_tags` | ✅ | Owner manage; public read | |
| `review_responses` | ✅ | Owner manage all; public SELECT | |

**Verdict: PASS**

---

## 2. PDPA Deletion Cascade

Account deletion flow: `workers/handlers/account_deletion.py` calls `db.auth.admin.delete_user(user_id)`, which triggers `ON DELETE CASCADE` on all FK references to `auth.users`. Storage (check-in photos, menu photos) is deleted explicitly before the auth record is removed.

| Table | Cascade | Path |
|-------|---------|------|
| `profiles` | ✅ | `auth.users(id) → profiles.id` |
| `lists` | ✅ | `auth.users(id) → lists.user_id` |
| `check_ins` | ✅ | `auth.users(id) → check_ins.user_id` |
| `shop_followers` | ✅ | `auth.users(id) → shop_followers.user_id` |
| `shop_submissions` | ✅ | `auth.users(id) → shop_submissions.submitted_by` |
| `community_note_likes` | ✅ | `auth.users(id) → community_note_likes.user_id` |
| `shop_claims` | ✅ | `auth.users(id) → shop_claims.user_id` |
| `review_responses` | 🔧 | `auth.users(id) → review_responses.owner_id` — **CASCADE was missing; fixed in migration `20260401000001`** |
| Check-in photos | ✅ | Explicitly deleted from `checkin-photos` bucket before auth delete |
| Menu photos | ✅ | Explicitly deleted from storage by URL before auth delete |

**Verdict: PASS after fix** (`20260401000001_fix_review_responses_owner_cascade.sql`)

---

## 3. Auth & API Security

### Admin endpoints

All routes in `admin.py`, `admin_claims.py`, `admin_roles.py`, `admin_shops.py`, `admin_taxonomy.py` use `Depends(require_admin)` on every endpoint.

**Verdict: PASS** ✅

### User mutation endpoints

All user-mutation routes (`checkins.py`, `lists.py`, `submissions.py`, `followers.py`, `claims.py`, `profile.py`) use `Depends(get_current_user)`.

**Verdict: PASS** ✅

### Rate limiting on `/submissions`

The `POST /submissions` endpoint enforces a **5 active submissions per day per user** limit at the DB query layer (`submissions.py:54-60`). Rate limit is keyed by `user_id`, not IP address.

**Known gap:** A single person with multiple accounts from the same IP can bypass the per-user limit. Accepted risk for beta given the auth barrier to account creation.

**Verdict: ⚠️ Accepted for beta**

---

## 4. Analytics Privacy

### PostHog — user ID anonymization

All analytics events sent via `POST /analytics/events` pass through `analytics.py:59`:
```python
distinct_id = anonymize_user_id(user_id, salt=settings.anon_salt)
```
SHA-256 one-way hash with `ANON_SALT`. Raw auth UUIDs are never sent to PostHog.

`identify()` exists in the adapter but is not called in any production code path.

**Verdict: PASS** ✅

### Sentry — PII scrubbing

`main.py:50` initializes Sentry with `send_default_pii=False`. No user email or name is attached to Sentry error context.

**Verdict: PASS** ✅

### ANON_SALT rotation plan

No rotation plan currently documented. Rotating the salt invalidates all existing PostHog user history (distinct IDs change), making historical cohort analysis impossible.

**Recommendation:** Document that `ANON_SALT` should only be rotated if a breach of the salt itself is suspected. Add a note in `backend/.env.example`.

**Verdict: ⚠️ Low risk — no rotation needed unless compromised**

---

## 5. SQL Migration Lint (DEV-53)

Ran `sqlfluff lint supabase/migrations/ --dialect postgres` over all 81 migrations.

**Result: PASS** — no structural or safety violations found.

Cosmetic violations (spacing, capitalisation, quoted policy names) excluded via `supabase/.sqlfluff`. CI workflow (`sql-lint.yml`) hardened — `continue-on-error: true` removed, now enforced on every PR to main touching `supabase/migrations/`.

---

## 6. Cron Job Audit (DEV-133)

### APScheduler jobs (`backend/workers/scheduler.py`)

| Job | Schedule (Taipei) | Idempotency | Status |
|-----|-------------------|-------------|--------|
| `staleness_sweep` | Daily @ 03:00 | `@idempotent_cron(window="day")` — DB upsert on `cron_locks` | ✅ |
| `reembed_reviewed_shops` | Daily @ 03:30 | `@idempotent_cron(window="day")` | ✅ |
| `delete_expired_accounts` | Daily @ 04:00 | `@idempotent_cron(window="day")` | ✅ |
| `weekly_email` | Monday @ 09:00 | `@idempotent_cron(window="week")` | ✅ |
| `poll_pending_jobs` | Interval (configurable) | Stateless; `max_instances=1, coalesce=True` prevents pile-up | ✅ |
| `reclaim_stuck_jobs` | Every 5 min | Stateless; `max_instances=1, coalesce=True` | ✅ |

**Idempotency mechanism:** `acquire_cron_lock()` in `queue.py` uses `upsert ... ignore_duplicates=True` on the `cron_locks` table. A non-empty response means the lock was newly acquired (first run in window). Empty response = already ran. Lock acquisition failure falls back to `True` (proceed with caution) — logged to Sentry.

Cron locks are cleaned up by `reclaim_stuck_jobs` once per day via `cleanup_old_cron_locks(retention_days=7)`.

**Health check:** `GET /health/scheduler` returns all 6 registered jobs with `next_run` times and `last_poll_at`.

### pg_cron job

| Job | Schedule | Status |
|-----|----------|--------|
| `cleanup-search-cache` | Hourly (`0 * * * *`) | ⏳ Blocked on DEV-55 (enable pg_cron extension in Railway Supabase) |

Migration `20260327000004_register_search_cache_cron.sql` is safe — no-ops if pg_cron is not enabled, so it applied cleanly on local and staging.

### Staging verification (post-deploy ops — not automatable)

- [ ] `GET /health/scheduler` on staging — all 6 jobs with `next_run` times
- [ ] Railway logs: `idempotent_cron` lock acquisition on first run
- [ ] After DEV-55: `SELECT * FROM cron.job;` in Supabase SQL editor → `cleanup-search-cache` registered

**Code verdict: PASS** — all schedules, idempotency guards, and health check endpoints are correctly wired. Staging ops verification deferred to post-deploy.

---

## 7. Analytics Events Audit (DEV-51)

### Spec events (metrics.md required 7)

| Event | Fired in frontend | Backend validation | Properties match spec | Status |
|-------|-------------------|-------------------|-----------------------|--------|
| `search_submitted` | ✅ `search/page.tsx` | ✅ typed model | `query_text`, `query_type`, `mode_chip_active`, `result_count` | ✅ |
| `shop_detail_viewed` | ✅ `shop-detail-client.tsx` | ✅ typed model | `shop_id`, `referrer`, `session_search_query?` | ✅ |
| `shop_url_copied` | ✅ `share-button.tsx` + `share-popover.tsx` | ✅ typed model | `shop_id`, `copy_method: native_share\|clipboard` | ✅ |
| `checkin_completed` | ✅ `checkin/[shopId]/page.tsx` | ✅ typed model + DB enrichment | `shop_id`, `has_text_note`, `has_menu_photo` + `is_first_checkin_at_shop` server-side | ✅ |
| `profile_stamps_viewed` | ✅ `profile/page.tsx` | ✅ typed model | `stamp_count` | ✅ |
| `filter_applied` | ✅ `filter-sheet.tsx` | ✅ typed model | `filter_type`, `filter_value` | ✅ |
| `session_start` | ✅ `session-tracker.tsx` | ✅ typed model | `days_since_first_session`, `previous_sessions` | ✅ |

### Phase 3+ feature events (passthrough)

| Feature | Events | Status |
|---------|--------|--------|
| Tarot draw | `tarot_card_tapped`, `tarot_draw_loaded`, `tarot_draw_again`, `tarot_empty_state`, `tarot_lets_go`, `tarot_share_tapped` | ✅ instrumented |
| Community notes | `community_feed_opened`, `community_note_viewed`, `community_note_liked` | ✅ instrumented |
| Shop claims | `claim_form_viewed`, `claim_form_submitted` | ✅ instrumented |
| Map/list toggle | `view_toggled`, `shop_preview_opened` | ✅ instrumented |
| **Follow/unfollow** | — | ⚠️ Not instrumented — no PostHog event on follow/unfollow shop |
| **Shop submission** | — | ⚠️ Not instrumented — no PostHog event on submission form |
| Vibe tag browse | — | ⚠️ No dedicated `vibe_tag_browsed` event (may be implicit in `filter_applied`) |

### PDPA compliance

- Spec event models strip all unlisted properties at Pydantic validation time (no extra fields pass through)
- Passthrough events go through `sanitize_passthrough()` which removes `PDPA_BLOCKED_FIELDS = {email, phone, user_id, name, address}`
- All `distinct_id` values are SHA-256 anonymized via `anonymize_user_id()` before sending to PostHog

### Missing events (non-blocking for beta)

Follow/unfollow and shop submission events are nice-to-have for engagement tracking but not in the metrics.md spec. These can be added post-beta in a separate instrumentation pass.

**Verdict: PASS for beta** — all 7 spec events correctly wired and validated. Missing Phase 3+ events are non-critical.

---

## 8. Sub-issue Status (as of 2026-04-01)

| Ticket | Title | Status | Type |
|--------|-------|--------|------|
| DEV-42 | Add NEXT_PUBLIC_GA_MEASUREMENT_ID to .env.example | ✅ Done | Code |
| DEV-30 | Set up Google Analytics 4 | ✅ Done | Code |
| DEV-47 | Add ANON_SALT to backend/.env.example | ✅ Done | Code |
| DEV-46 | Fix duplicate migration timestamp | ✅ Done | Code |
| DEV-49 | Security review (this audit) | 🔧 Fix shipped | Code |
| DEV-48 | Activate observability stack on Railway | ⏳ Todo | Ops |
| DEV-51 | Analytics events review | ✅ Done | Code |
| DEV-53 | SQL lint — migrations before prod | ✅ Done | Code |
| DEV-55 | Enable pg_cron on Railway Supabase | ⏳ Todo | Ops |
| DEV-133 | Audit all cron jobs before prod | ✅ Done (staging ops pending) | Code |
| DEV-57 | Post-deploy: dry-run reembed script | ⏳ Todo | Ops |
| DEV-58 | Beta program — recruit 30-50 users | ⏳ Todo | Ops |
| DEV-59 | Public Threads launch | ⏳ Todo | Ops |

---

## 6. Outstanding Before Beta Can Open

The following must be resolved before the first beta user is onboarded:

1. **DEV-48** — Activate Sentry, PostHog, Better Stack in Railway (errors must be visible)
2. **DEV-49 migration** — Deploy `20260401000001_fix_review_responses_owner_cascade.sql` to prod ✅ (in this PR)
3. **DEV-55** — Enable `pg_cron` on Railway Supabase (search cache cleanup will not run without it)

The following are recommended but non-blocking for beta:

- DEV-51 (analytics review)
- DEV-53 (SQL lint)
- DEV-133 (cron audit)
