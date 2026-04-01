# Design: Payment Methods on Shop Detail + Find Page Filters

**Date:** 2026-04-01
**Ticket:** DEV-90
**Milestone:** Post-Beta V1

---

## Goal

Surface granular payment method information (cash, card, LINE Pay, TWQR, Apple Pay, Google Pay) on shop detail pages and as filters on the Find page. Reduces a common friction point ("does this place take card?") before visiting a café. Community crowdsourcing supplements scraped/AI-inferred data.

---

## Architecture

Three independent tracks that can be built in parallel after the Foundation migrations land:

1. **Data foundation** — DB schema + PDPA-safe community confirmations table
2. **Filter wiring** — quick win, touches only `filter-map.ts` + both filter sheets
3. **Shop detail UI + community submission** — PaymentMethodSection + backend service + check-in integration

---

## Data Model

### Migration A — `payment_methods` JSONB on `shops`

```sql
ALTER TABLE shops ADD COLUMN payment_methods JSONB DEFAULT '{}';
```

Schema convention:
```json
{
  "cash":       true,      // accepted
  "card":       false,     // not accepted
  "line_pay":   null,      // unknown (omit key or set null)
  "twqr":       null,
  "apple_pay":  null,
  "google_pay": null
}
```

Values:
- `true` — accepted
- `false` — not accepted (explicitly known)
- `null` / key absent — unknown (hidden from UI)

Supported methods: `cash`, `card`, `line_pay`, `twqr`, `apple_pay`, `google_pay`

### Migration B — Community confirmations table

```sql
CREATE TABLE shop_payment_confirmations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method     TEXT NOT NULL
             CHECK (method IN ('cash','card','line_pay','twqr','apple_pay','google_pay')),
  vote       BOOLEAN NOT NULL,  -- true = accepts, false = does not accept
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, user_id, method)
);
```

RLS: users can read all rows, insert/update/delete their own rows.

PDPA cascade: `ON DELETE CASCADE` on `user_id` FK — account deletion automatically removes all confirmations. No changes to `account_deletion.py` required.

### Migration C — Bootstrap from taxonomy tags

Backfill `payment_methods` from existing `shop_tags` for shops that have been enriched:

- `cash_only` tag → `{cash: true, card: false}`
- `mobile_payment` tag → `{line_pay: true}` (conservative — only LINE Pay confirmed)

---

## Backend

### `backend/services/payment_service.py`

Functions:
- `get_payment_methods(shop_id: str, user_id: str | None)` → `PaymentMethodsView` (JSONB merged with confirmation counts + requesting user's own votes)
- `upsert_confirmation(shop_id: str, user_id: str, method: str, vote: bool)` → upsert to `shop_payment_confirmations`
- `get_user_confirmations(shop_id: str, user_id: str)` → dict of method → vote (for prefilling check-in form)

### `backend/api/payments.py` (or extend `shops.py`)

- `GET /api/shops/{shop_id}/payment-methods` — public, returns methods + confirmation counts
- `POST /api/shops/{shop_id}/payment-methods/confirm` — auth-gated, body: `{method, vote}`

### Search RPC

Update `search_shops` RPC to include `payment_methods` JSONB in the shop response shape so the Find page has it client-side.

---

## Find Page Filters

### `components/filters/filter-map.ts`

Extend with two new entries:

```ts
export type TagFilterId = 'wifi' | 'outlet' | 'quiet' | 'cash_only' | 'mobile_payment';

export const FILTER_TO_TAG_IDS: Record<TagFilterId, string> = {
  wifi:           'wifi_available',
  outlet:         'power_outlets',
  quiet:          'quiet',
  cash_only:      'cash_only',
  mobile_payment: 'mobile_payment',
};
```

Filter logic in `page.tsx` already handles new entries — the taxonomy tag matching loop requires no changes.

### Both filter sheets

Add `{ id: 'mobile_payment', label: 'Mobile Payment' }` to the Functionality tab in:
- `components/filters/filter-sheet.tsx`
- `components/discovery/filter-sheet.tsx`

`cash_only` is already present in both — no change needed there.

---

## Shop Detail — `PaymentMethodSection`

New component placed after `<AttributeChips>` (below the existing divider).

### Display rules

| `payment_methods[method]` | Confirmations | Display |
|--------------------------|---------------|---------|
| `true` | 0 | chip + "reported" label |
| `true` | ≥1 | chip + check + count |
| `false` | any | "Not accepted" chip (muted, cash/card only — contextually useful) |
| `null` / missing | — | hidden |

### Interaction

"+ Suggest edit" link → bottom-sheet on mobile, popover on desktop. Auth-gated.

Modal shows six toggles (Yes / No / Unsure per method). Submits via `POST /api/shops/{id}/payment-methods/confirm`. Optimistic update on the local UI.

---

## Check-in Integration

Add an optional payment methods step to the check-in form (after photo upload, before submit).

Six toggle chips: Cash / Card / LINE Pay / TWQR / Apple Pay / Google Pay. User taps any they observed. Skippable — no required field.

On submit, each selected method fires `upsert_confirmation` with `vote: true`. Unselected methods are not submitted (not `vote: false` — absence of confirmation ≠ rejection).

---

## Apify Investigation

Async, non-blocking sub-issue. If Apify returns payment data, wire into `enrich_shop.py` to populate `payment_methods` JSONB directly (higher confidence than community sourcing). Document field mapping in `docs/patterns/` once confirmed.

---

## Testing

### Backend (pytest)

- `backend/tests/services/test_payment_service.py` — unit tests for get, upsert, merge logic
- Coverage gate: 80% required on `payment_service.py`

### Frontend (Vitest + Testing Library)

- `PaymentMethodSection` component: renders correct chips per method state
- Confirm modal: toggle interaction, submit call, auth-gate
- `filter-map.ts` change: no dedicated test needed (covered by find-page integration tests)

### E2E

- No new critical user path — community confirmation is supplementary. No new `/e2e-smoke` journey required.

---

## Mobile

Shop detail and filter sheets are already mobile-responsive (Tailwind, vaul Drawer). New components follow the same patterns:

- `PaymentMethodSection` — inline section, wrapping chips
- Confirm modal — bottom-sheet via vaul on mobile, popover on desktop (matching existing pattern from check-in entry point)

---

## Sub-issues

Created in execution order:

1. **[Foundation, M]** DB migrations: `payment_methods` JSONB + `shop_payment_confirmations` + bootstrap from taxonomy
2. **[S]** Wire `cash_only` + `mobile_payment` in `filter-map.ts` + add `mobile_payment` to both filter sheets
3. **[Foundation, M]** `payment_service.py` + API endpoints + `search_shops` RPC update
4. **[M]** `PaymentMethodSection` component on shop detail (mobile + desktop)
5. **[M]** Check-in form payment method step
6. **[M]** Apify investigation + enrichment pipeline wiring

---

## Alternatives Rejected

**Separate `shop_payment_methods` table** — normalized, one row per method per shop. Rejected: more joins for a simple boolean-per-method payload; JSONB is idiomatic for small, fixed-key maps. Confirmations still use a proper table for append semantics.

**Taxonomy-only approach** — use existing `cash_only`/`mobile_payment` taxonomy tags as the only data source. Rejected: taxonomy tags are AI-inferred from reviews, have low precision for factual payment data, and don't support granular methods (LINE Pay vs TWQR). Taxonomy tags still power the filter; JSONB column adds structured, crowdsourced precision.

**Filter via `payment_methods` JSONB** — filter shops on the Find page by querying `payment_methods` JSONB rather than taxonomy tags. Rejected for V1: filter logic in `page.tsx` is client-side and already uses taxonomy tags; taxonomy `cash_only` tag coverage is sufficient for the filter use case.
