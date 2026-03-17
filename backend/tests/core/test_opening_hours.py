# backend/tests/core/test_opening_hours.py
from datetime import datetime

from zoneinfo import ZoneInfo

from core.opening_hours import is_open_now

TW = ZoneInfo("Asia/Taipei")


class TestIsOpenNow:
    """Given a shop's opening_hours list and a reference time, determine if the shop is open."""

    def test_open_during_listed_hours(self):
        hours = ["Monday: 9:00 AM - 6:00 PM"]
        now = datetime(2026, 3, 16, 14, 0, tzinfo=TW)  # Monday 2pm
        assert is_open_now(hours, now) is True

    def test_closed_outside_listed_hours(self):
        hours = ["Monday: 9:00 AM - 6:00 PM"]
        now = datetime(2026, 3, 16, 20, 0, tzinfo=TW)  # Monday 8pm
        assert is_open_now(hours, now) is False

    def test_closed_on_unlisted_day(self):
        hours = ["Monday: 9:00 AM - 6:00 PM"]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday 2pm
        assert is_open_now(hours, now) is False

    def test_midnight_crossing_before_midnight(self):
        hours = ["Friday: 10:00 AM - 2:00 AM"]
        now = datetime(2026, 3, 20, 23, 30, tzinfo=TW)  # Friday 11:30pm
        assert is_open_now(hours, now) is True

    def test_midnight_crossing_after_midnight(self):
        hours = ["Friday: 10:00 AM - 2:00 AM"]
        now = datetime(2026, 3, 21, 1, 0, tzinfo=TW)  # Saturday 1am (still in Friday's range)
        assert is_open_now(hours, now) is True

    def test_midnight_crossing_outside_range(self):
        hours = ["Friday: 10:00 AM - 2:00 AM"]
        now = datetime(2026, 3, 21, 3, 0, tzinfo=TW)  # Saturday 3am
        assert is_open_now(hours, now) is False

    def test_24_hour_shop(self):
        hours = ["Monday: Open 24 hours"]
        now = datetime(2026, 3, 16, 3, 0, tzinfo=TW)  # Monday 3am
        assert is_open_now(hours, now) is True

    def test_null_hours_returns_none(self):
        assert is_open_now(None, datetime(2026, 3, 16, 14, 0, tzinfo=TW)) is None

    def test_empty_list_returns_none(self):
        assert is_open_now([], datetime(2026, 3, 16, 14, 0, tzinfo=TW)) is None

    def test_multiple_days(self):
        hours = [
            "Monday: 9:00 AM - 6:00 PM",
            "Tuesday: 9:00 AM - 6:00 PM",
            "Wednesday: 9:00 AM - 6:00 PM",
        ]
        now = datetime(2026, 3, 18, 12, 0, tzinfo=TW)  # Wednesday noon
        assert is_open_now(hours, now) is True

    def test_closed_string(self):
        hours = ["Sunday: Closed"]
        now = datetime(2026, 3, 22, 14, 0, tzinfo=TW)  # Sunday 2pm
        assert is_open_now(hours, now) is False

    def test_noon_boundary_12pm(self):
        hours = ["Monday: 12:00 PM - 9:00 PM"]
        now = datetime(2026, 3, 16, 12, 0, tzinfo=TW)
        assert is_open_now(hours, now) is True

    def test_24h_format_fallback(self):
        """Some scrapers use 24h format like '09:00 - 18:00'."""
        hours = ["Monday: 09:00 - 18:00"]
        now = datetime(2026, 3, 16, 14, 0, tzinfo=TW)
        assert is_open_now(hours, now) is True
