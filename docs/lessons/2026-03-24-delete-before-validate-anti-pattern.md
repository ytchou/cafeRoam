# Replace-on-Extract: Validate Before Delete

**Date:** 2026-03-24
**Context:** Menu items embedding feature (DEV-6) — enrich_menu_photo handler

**What happened:** The replace-on-extract pattern was implemented as DELETE then INSERT, with the INSERT guarded by `if rows:`. When all LLM-returned items had empty names, `rows` was empty, the DELETE had already run, and the INSERT was skipped — silently wiping the shop's menu items with no error or log signal.

**Root cause:** The guard was placed after the destructive operation. The natural instinct is to "clear space then fill it," but this creates a data-loss window whenever the fill step is conditional.

**Prevention:** Always validate before destroying. The pattern for replace-on-extract:

1. Build the replacement data first
2. If replacement data is empty or invalid, return early — do NOT delete
3. Only delete existing data when you have confirmed non-empty replacement ready
4. Delete and insert in immediate sequence (minimize the gap)

```python
# Wrong:
db.delete(shop_id)
rows = [build rows...]
if rows:
    db.insert(rows)  # delete already ran — too late

# Correct:
rows = [build rows...]
if not rows:
    return  # nothing to replace with — preserve existing
db.delete(shop_id)
db.insert(rows)
```
