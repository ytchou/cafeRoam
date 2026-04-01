# Design: Normalize `opening_hours` to Language-Agnostic Structured Format

**Date:** 2026-04-01
**Ticket:** DEV-148
**Status:** Approved

## Goal

Replace `opening_hours` string storage (`["星期一: 12:00 to 23:00", ...]`) with a structured JSONB format (`[{day: 0, open: 720, close: 1380}]`). The `is_open_now` function becomes pure arithmetic — no locale parsing, no string matching.

## Structured Schema

```python
class StructuredHours(BaseModel):
    day: int          # 0=Monday … 6=Sunday
    open: int | None  # minutes since midnight, null = confirmed closed
    close: int | None # minutes since midnight, null = confirmed closed
```

**Three-state semantics (preserved from current behaviour):**

| Representation                      | Meaning                       |
| ----------------------------------- | ----------------------------- |
| `{day: N, open: 720, close: 1380}`  | Open, 12:00–23:00             |
| `{day: N, open: 0, close: 1440}`    | Open 24 hours                 |
| `{day: N, open: null, close: null}` | Confirmed closed (e.g. 休息)  |
| Day absent from array               | Unknown — scraper had no data |

The DB column `opening_hours` is already `JSONB` — no column migration needed, only a data migration.

## Architecture

### Data Flow

```
Apify raw:  [{day: "星期一", hours: "12:00 to 23:00"}]
     ↓  apify_adapter._parse_place() → parse_to_structured()
ScrapedShopData.opening_hours: [StructuredHours(day=0, open=720, close=1380)]
     ↓  persist.py writes as-is (unchanged)
DB shops.opening_hours (JSONB): [{"day": 0, "open": 720, "close": 1380}]
     ↓  is_open_now() — pure arithmetic comparison
bool | None
```

### Layer Responsibilities

| Layer                                        | Change                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/core/opening_hours.py`              | Add `StructuredHours` type + `parse_to_structured(list[str]) -> list[StructuredHours]`. Rewrite `is_open_now` to accept `list[StructuredHours]`. Existing private helpers (`_DAY_MAP`, `_parse_time_to_minutes`, `_RANGE_SEP_RE`) remain — used by `parse_to_structured`. |
| `backend/models/types.py`                    | `Shop.opening_hours: list[StructuredHours] \| None`                                                                                                                                                                                                                       |
| `backend/providers/scraper/interface.py`     | `ScrapedShopData.opening_hours: list[StructuredHours] \| None`                                                                                                                                                                                                            |
| `backend/providers/scraper/apify_adapter.py` | `_parse_place()` calls `parse_to_structured()` on the raw Apify `openingHours` array                                                                                                                                                                                      |
| `persist.py`, `shops.py`, `tarot_service.py` | **No changes** — `is_open_now` signature is unchanged; callers pass `shop["opening_hours"]` as before                                                                                                                                                                     |

## Files Changed

| File                                            | Type of change                                                  |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `backend/core/opening_hours.py`                 | Core domain logic — new type + parser + rewritten runtime check |
| `backend/models/types.py`                       | Type update                                                     |
| `backend/providers/scraper/interface.py`        | Type update                                                     |
| `backend/providers/scraper/apify_adapter.py`    | Normalization at ingest                                         |
| `backend/tests/core/test_opening_hours.py`      | Rewrite for structured format; add `parse_to_structured` tests  |
| `backend/tests/providers/test_apify_adapter.py` | Update expectations                                             |
| `scripts/migrate_opening_hours.py`              | One-time data migration (new file)                              |

## Migration Strategy

**Migrate-before-deploy:** run `scripts/migrate_opening_hours.py` against the target environment before deploying the new code. By deploy time, all rows are already structured — `is_open_now` never sees the old format. No dual-path logic needed.

```python
# scripts/migrate_opening_hours.py (simplified)
for shop in db.table("shops").select("id, opening_hours").execute().data:
    old = shop["opening_hours"]
    if not old or not isinstance(old[0], str):
        continue  # already migrated or empty
    structured = [s.model_dump() for s in parse_to_structured(old)]
    db.table("shops").update({"opening_hours": structured}).eq("id", shop["id"]).execute()
```

**Deploy order:**

1. Run migration locally → spot-check 5 shops
2. Run migration on staging → smoke test Open Now filter
3. Merge + deploy PR
4. Run migration on prod (Railway) immediately after deploy

## Error Handling

- `parse_to_structured()` is fault-tolerant: unparseable strings are silently skipped. A shop with 7 entries where 2 fail to parse returns 5 structured entries — missing days treated as unknown (same as current behaviour).
- Migration script logs shops where all entries fail to parse for manual review.

## Testing Classification

**(a) New e2e journey?**

- [ ] No — no new user-facing path introduced

**(b) Coverage gate impact?**

- [x] Yes — `opening_hours.py` is used by `is_open_now` in both the Open Now filter and Tarot feature. 80% coverage gate must hold. `test_opening_hours.py` provides full coverage of all cases.
