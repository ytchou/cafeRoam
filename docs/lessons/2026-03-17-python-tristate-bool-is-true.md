# Python Tri-State Bool: `is not False` Maps None → True

**Date:** 2026-03-17
**Context:** tarot_service.py — `is_open_now()` returns `bool | None` (None = unknown hours)

## What happened

`_to_card()` used `shop.is_open_now is not False` to include shops in the result set.

- `True is not False` → True (correct — open shops included)
- `False is not False` → False (correct — closed shops excluded)
- `None is not False` → **True** (wrong — shops with unknown hours were shown as "Open Now")

This caused shops without opening hours data to appear as open in the tarot draw.

## Root cause

`is not False` is a natural-language reading ("is it not closed?") but its logical meaning in Python includes `None`. The correct guard when the function returns a tri-state is `is True`.

## Prevention

- Whenever a boolean-returning function can return `None` (tri-state), always use `is True` for the positive guard, never `is not False`.
- When writing or reviewing filter predicates on Python `bool | None` fields, ask: "what happens when this is None?"
- Type: annotate tri-state returns as `bool | None`, not `bool`, so callers are forced to handle all three states.
