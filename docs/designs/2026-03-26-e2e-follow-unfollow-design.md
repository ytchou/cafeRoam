# Design: E2E Shop Follow/Unfollow Journey (DEV-61)

Date: 2026-03-26

## Goal

Add E2E coverage for the shop follow/unfollow mechanic (DEV-20). The follow-button component has a unit test, but no test verifies the end-to-end flow through the real UI.

## Decisions

- **Verification strategy:** Button state only (aria-label toggle). No follower count assertions — the >= 10 visibility threshold makes count assertions unreliable in E2E environments with a single test user.
- **File location:** New `e2e/following.spec.ts` (dedicated file, matches existing spec-per-feature pattern).
- **Auth wall:** Included — unauthenticated follow click redirects to /login.

## Architecture

### New file: `e2e/following.spec.ts`

Two test groups covering two journeys:

### J40 — Authenticated follow/unfollow toggle

```
test.describe.serial('@critical J40 — Follow/unfollow toggle')
  1. Navigate to a shop detail page (pick first seeded shop)
  2. Assert follow button visible with aria-label "Follow this shop"
  3. Click follow -> wait for aria-label to become "Unfollow this shop"
  4. Click unfollow -> wait for aria-label to revert to "Follow this shop"
```

- Uses `authedPage` fixture from `e2e/fixtures/auth.ts`
- `.serial` because follow -> unfollow must run in order
- Selects button via `page.getByRole('button', { name: /follow this shop/i })`

### J41 — Follow requires authentication

```
test.describe('@critical J41 — Follow requires authentication')
  1. Navigate to shop detail page (no auth)
  2. Click follow button
  3. Assert redirect to /login
```

- Uses standard `@playwright/test` (no auth fixture)

### Components touched

| Component               | Role                             |
| ----------------------- | -------------------------------- |
| `e2e/following.spec.ts` | New spec file (sole deliverable) |
| `docs/e2e-journeys.md`  | Add J40, J41 entries             |

### Data flow

```
Shop detail page -> follow-button (aria-label) -> click -> API proxy -> FastAPI
                                                            |
                                                  aria-label toggle observed
```

### Error handling

- `test.skip(!shop, 'No seeded shops available')` — skip gracefully if no shops in DB
- Standard Playwright timeout (10s) for aria-label change

## Testing classification

- [x] New e2e journey? Yes — J40 (follow/unfollow toggle), J41 (follow auth wall)
- [ ] Coverage gate impact? No — no critical-path service touched (E2E only)
