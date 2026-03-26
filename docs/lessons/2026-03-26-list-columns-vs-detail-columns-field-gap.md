# Missing field in _SHOP_LIST_COLUMNS when adding to _SHOP_DETAIL_COLUMNS
**Date:** 2026-03-26
**Context:** DEV-34 community_summary display feature
**What happened:** `community_summary` was added only to `_SHOP_DETAIL_COLUMNS` because the tests
covered the shop detail endpoint (`GET /shops/{id}`). The list endpoint (`GET /shops/`) uses
`_SHOP_LIST_COLUMNS` and feeds `ShopCardCompact` on the browse/map path — it silently returned null
for all shops even though summaries existed in the DB.
**Root cause:** Tests only covered the code path that was modified (detail endpoint). The browse path
was never tested for the new field, so the gap went undetected.
**Prevention:** When adding a display field to a shop card component (`ShopCardCompact`), verify
BOTH column sets: `_SHOP_LIST_COLUMNS` (browse/map) and `_SHOP_DETAIL_COLUMNS` (shop detail page).
The rule of thumb: if the field appears on a card shown in listing views, it belongs in
`_SHOP_LIST_COLUMNS`. If it's detail-only, `_SHOP_DETAIL_COLUMNS` alone is correct.
