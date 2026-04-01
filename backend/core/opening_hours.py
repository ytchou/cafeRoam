"""Parse opening_hours strings and determine if a shop is currently open.

Structured format: list of {day: int, open: int|null, close: int|null}
  - day: 0=Monday … 6=Sunday
  - open/close: minutes since midnight (null = confirmed closed)
  - Day absent from list = unknown (scraper had no data)

Legacy string parsing is retained in parse_to_structured() for migration
and ingest normalization. is_open_now() works on structured data only.
"""

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class StructuredHours(BaseModel):
    day: int
    open: int | None = None
    close: int | None = None


# --- Legacy string parsing (used by parse_to_structured only) ---

_DAY_MAP = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
    # Chinese day names
    "星期一": 0,
    "星期二": 1,
    "星期三": 2,
    "星期四": 3,
    "星期五": 4,
    "星期六": 5,
    "星期日": 6,
}

_TIME_RE = re.compile(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", re.IGNORECASE)
_RANGE_SEP_RE = re.compile(r"\s*(?:[-\u2013]|\bto\b)\s*", re.IGNORECASE)


def _parse_time_to_minutes(time_str: str) -> int:
    m = _TIME_RE.match(time_str.strip())
    if not m:
        raise ValueError(f"Cannot parse time: {time_str!r}")
    hour, minute = int(m.group(1)), int(m.group(2))
    ampm = m.group(3)
    if ampm:
        ampm = ampm.upper()
        if ampm == "PM" and hour != 12:
            hour += 12
        elif ampm == "AM" and hour == 12:
            hour = 0
    return hour * 60 + minute


def parse_to_structured(opening_hours: list[str]) -> list[StructuredHours]:
    """Convert legacy string opening_hours to structured format.

    Fault-tolerant: unparseable entries are silently skipped.
    """
    result: list[StructuredHours] = []
    for entry in opening_hours:
        entry = entry.strip()
        if ":" not in entry:
            continue

        day_part, _, time_part = entry.partition(":")
        day_name = day_part.strip().lower()
        time_part = time_part.strip()

        day_num = _DAY_MAP.get(day_name)
        if day_num is None:
            continue

        # Closed sentinel
        if "closed" in time_part.lower() or "休息" in time_part:
            result.append(StructuredHours(day=day_num, open=None, close=None))
            continue

        # 24-hour sentinel
        if "24 hour" in time_part.lower() or "24hour" in time_part.lower():
            result.append(StructuredHours(day=day_num, open=0, close=1440))
            continue

        # Parse time range
        parts = _RANGE_SEP_RE.split(time_part)
        if len(parts) != 2:
            continue

        try:
            open_min = _parse_time_to_minutes(parts[0])
            close_min = _parse_time_to_minutes(parts[1])
        except ValueError:
            continue

        result.append(StructuredHours(day=day_num, open=open_min, close=close_min))

    return result


# --- Structured is_open_now (pure arithmetic) ---


def _coerce_entry(entry: Any) -> StructuredHours | None:
    """Accept StructuredHours or raw dict from DB JSONB."""
    if isinstance(entry, StructuredHours):
        return entry
    if isinstance(entry, dict):
        try:
            return StructuredHours(**entry)
        except (TypeError, ValueError):
            return None
    return None


def is_open_now(
    opening_hours: list[StructuredHours | dict[str, Any]] | None,
    now: datetime,
) -> bool | None:
    """Check if a shop is currently open using structured hours.

    Returns True/False if determinable, None if unknown (null/empty or
    current day not in the list).
    """
    if not opening_hours:
        return None

    current_weekday = now.weekday()
    current_minutes = now.hour * 60 + now.minute
    today_seen = False

    for raw_entry in opening_hours:
        entry = _coerce_entry(raw_entry)
        if entry is None:
            continue

        if entry.day == current_weekday:
            today_seen = True

        # Closed sentinel
        if entry.open is None or entry.close is None:
            if entry.day == current_weekday:
                return False
            continue

        if entry.close > entry.open:
            # Normal range
            if entry.day == current_weekday and entry.open <= current_minutes < entry.close:
                return True
        else:
            # Midnight crossing (close < open, e.g. open=600 close=120)
            if entry.day == current_weekday and current_minutes >= entry.open:
                return True
            prev_day = (current_weekday - 1) % 7
            if entry.day == prev_day:
                today_seen = True
                if current_minutes < entry.close:
                    return True

    return False if today_seen else None
