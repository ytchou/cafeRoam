"""Parse opening_hours strings and determine if a shop is currently open.

The opening_hours field is a list[str] populated by scrapers in formats like:
  - "Monday: 9:00 AM - 6:00 PM"
  - "Friday: 10:00 AM - 2:00 AM"  (midnight crossing)
  - "Monday: Open 24 hours"
  - "Sunday: Closed"
  - "Monday: 09:00 - 18:00"  (24h format fallback)

All shops are in Asia/Taipei timezone.
"""

import re
from datetime import datetime

_DAY_MAP = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

_TIME_RE = re.compile(
    r"(\d{1,2}):(\d{2})\s*(AM|PM)?", re.IGNORECASE
)


def _parse_time_to_minutes(time_str: str) -> int:
    """Convert a time string like '9:00 AM' or '18:00' to minutes since midnight."""
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


def is_open_now(
    opening_hours: list[str] | None, now: datetime
) -> bool | None:
    """Check if a shop is currently open.

    Returns True/False if opening_hours can be parsed, or None if
    opening_hours is null/empty (unknown — caller decides how to treat).
    """
    if not opening_hours:
        return None

    current_weekday = now.weekday()  # 0=Monday
    current_minutes = now.hour * 60 + now.minute

    for entry in opening_hours:
        entry = entry.strip()
        if ":" not in entry:
            continue

        # Split on first colon to get day name and time range
        day_part, _, time_part = entry.partition(":")
        day_name = day_part.strip().lower()
        time_part = time_part.strip()

        day_num = _DAY_MAP.get(day_name)
        if day_num is None:
            continue

        # Handle special cases
        if "closed" in time_part.lower():
            if day_num == current_weekday:
                return False
            continue

        if "24 hour" in time_part.lower() or "24hour" in time_part.lower():
            if day_num == current_weekday:
                return True
            continue

        # Parse time range: "9:00 AM - 6:00 PM" or "09:00 - 18:00"
        parts = re.split(r"\s*[-\u2013]\s*", time_part)
        if len(parts) != 2:
            continue

        try:
            open_min = _parse_time_to_minutes(parts[0])
            close_min = _parse_time_to_minutes(parts[1])
        except ValueError:
            continue

        if close_min > open_min:
            # Normal range (e.g., 9:00 AM - 6:00 PM)
            if day_num == current_weekday and open_min <= current_minutes < close_min:
                return True
        else:
            # Midnight crossing (e.g., 10:00 AM - 2:00 AM)
            # Check same day: from open_min to midnight
            if day_num == current_weekday and current_minutes >= open_min:
                return True
            # Check next day: from midnight to close_min
            prev_day = (current_weekday - 1) % 7
            if day_num == prev_day and current_minutes < close_min:
                return True

    return False
