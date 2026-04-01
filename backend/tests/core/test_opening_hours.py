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

    def test_none_on_unlisted_day(self):
        """Given only Monday hours, Tuesday returns None (unknown) not False (closed)."""
        hours = ["Monday: 9:00 AM - 6:00 PM"]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday 2pm
        assert is_open_now(hours, now) is None

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


class TestChineseFormat:
    """Given opening_hours scraped in Chinese format (actual DB format), determine open status."""

    def test_chinese_day_open_during_hours(self):
        hours = ["星期一: 12:00 to 23:00"]
        now = datetime(2026, 3, 16, 15, 0, tzinfo=TW)  # Monday 3pm
        assert is_open_now(hours, now) is True

    def test_chinese_day_closed_outside_hours(self):
        hours = ["星期一: 12:00 to 23:00"]
        now = datetime(2026, 3, 16, 11, 0, tzinfo=TW)  # Monday 11am
        assert is_open_now(hours, now) is False

    def test_chinese_closed_marker(self):
        hours = ["星期二: 休息"]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday 2pm
        assert is_open_now(hours, now) is False

    def test_chinese_full_week_open(self):
        hours = [
            "星期六: 12:00 to 23:00",
            "星期日: 12:00 to 23:00",
            "星期一: 12:00 to 23:00",
            "星期二: 12:00 to 23:00",
            "星期三: 12:00 to 23:00",
            "星期四: 12:00 to 23:00",
            "星期五: 12:00 to 23:00",
        ]
        now = datetime(2026, 3, 18, 13, 0, tzinfo=TW)  # Wednesday 1pm
        assert is_open_now(hours, now) is True

    def test_chinese_mixed_closed_days(self):
        hours = [
            "星期一: 12:00 to 18:30",
            "星期二: 休息",
            "星期三: 休息",
            "星期四: 12:00 to 18:30",
            "星期五: 12:00 to 18:30",
            "星期六: 11:00 to 18:30",
            "星期日: 11:00 to 18:30",
        ]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday (休息)
        assert is_open_now(hours, now) is False

    def test_chinese_format_unknown_day_returns_none(self):
        hours = ["星期一: 12:00 to 18:00"]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday — not listed
        assert is_open_now(hours, now) is None
