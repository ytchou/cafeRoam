# backend/tests/core/test_opening_hours.py
from datetime import datetime
from zoneinfo import ZoneInfo

from core.opening_hours import StructuredHours, is_open_now, parse_to_structured

TW = ZoneInfo("Asia/Taipei")


class TestParseToStructured:
    """Given opening_hours strings from scrapers, convert to StructuredHours."""

    def test_chinese_format_normal_hours(self):
        result = parse_to_structured(["星期一: 12:00 to 23:00"])
        assert result == [StructuredHours(day=0, open=720, close=1380)]

    def test_english_format_12h(self):
        result = parse_to_structured(["Monday: 9:00 AM - 6:00 PM"])
        assert result == [StructuredHours(day=0, open=540, close=1080)]

    def test_english_format_24h(self):
        result = parse_to_structured(["Monday: 09:00 - 18:00"])
        assert result == [StructuredHours(day=0, open=540, close=1080)]

    def test_chinese_closed_marker(self):
        result = parse_to_structured(["星期二: 休息"])
        assert result == [StructuredHours(day=1, open=None, close=None)]

    def test_english_closed_marker(self):
        result = parse_to_structured(["Sunday: Closed"])
        assert result == [StructuredHours(day=6, open=None, close=None)]

    def test_24_hour_shop(self):
        result = parse_to_structured(["Monday: Open 24 hours"])
        assert result == [StructuredHours(day=0, open=0, close=1440)]

    def test_full_week_mixed(self):
        result = parse_to_structured(
            [
                "星期一: 12:00 to 18:30",
                "星期二: 休息",
                "星期三: 休息",
                "星期四: 12:00 to 18:30",
                "星期五: 12:00 to 18:30",
                "星期六: 11:00 to 18:30",
                "星期日: 11:00 to 18:30",
            ]
        )
        assert len(result) == 7
        assert result[0] == StructuredHours(day=0, open=720, close=1110)
        assert result[1] == StructuredHours(day=1, open=None, close=None)
        assert result[5] == StructuredHours(day=5, open=660, close=1110)

    def test_midnight_crossing_preserved(self):
        result = parse_to_structured(["Friday: 10:00 AM - 2:00 AM"])
        assert result == [StructuredHours(day=4, open=600, close=120)]

    def test_unparseable_entries_skipped(self):
        result = parse_to_structured(["garbage data", "星期一: 12:00 to 23:00"])
        assert result == [StructuredHours(day=0, open=720, close=1380)]

    def test_empty_list_returns_empty(self):
        assert parse_to_structured([]) == []

    def test_noon_boundary_12pm(self):
        result = parse_to_structured(["Monday: 12:00 PM - 9:00 PM"])
        assert result == [StructuredHours(day=0, open=720, close=1260)]


class TestIsOpenNowStructured:
    """Given structured opening_hours, determine if the shop is open via arithmetic."""

    def test_open_during_listed_hours(self):
        hours = [StructuredHours(day=0, open=540, close=1080)]  # Mon 9am-6pm
        now = datetime(2026, 3, 16, 14, 0, tzinfo=TW)  # Monday 2pm
        assert is_open_now(hours, now) is True

    def test_closed_outside_listed_hours(self):
        hours = [StructuredHours(day=0, open=540, close=1080)]
        now = datetime(2026, 3, 16, 20, 0, tzinfo=TW)  # Monday 8pm
        assert is_open_now(hours, now) is False

    def test_absent_day_returns_none(self):
        """Monday-only data; Tuesday query returns None (unknown)."""
        hours = [StructuredHours(day=0, open=540, close=1080)]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday 2pm
        assert is_open_now(hours, now) is None

    def test_closed_sentinel_returns_false(self):
        hours = [StructuredHours(day=1, open=None, close=None)]  # Tuesday closed
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday 2pm
        assert is_open_now(hours, now) is False

    def test_24_hour_shop(self):
        hours = [StructuredHours(day=0, open=0, close=1440)]
        now = datetime(2026, 3, 16, 3, 0, tzinfo=TW)  # Monday 3am
        assert is_open_now(hours, now) is True

    def test_midnight_crossing_before_midnight(self):
        hours = [StructuredHours(day=4, open=600, close=120)]  # Fri 10am-2am
        now = datetime(2026, 3, 20, 23, 30, tzinfo=TW)  # Friday 11:30pm
        assert is_open_now(hours, now) is True

    def test_midnight_crossing_after_midnight(self):
        hours = [StructuredHours(day=4, open=600, close=120)]  # Fri 10am-2am
        now = datetime(2026, 3, 21, 1, 0, tzinfo=TW)  # Saturday 1am
        assert is_open_now(hours, now) is True

    def test_midnight_crossing_outside_range(self):
        hours = [StructuredHours(day=4, open=600, close=120)]  # Fri 10am-2am
        now = datetime(2026, 3, 21, 3, 0, tzinfo=TW)  # Saturday 3am
        assert is_open_now(hours, now) is False

    def test_null_hours_returns_none(self):
        assert is_open_now(None, datetime(2026, 3, 16, 14, 0, tzinfo=TW)) is None

    def test_empty_list_returns_none(self):
        assert is_open_now([], datetime(2026, 3, 16, 14, 0, tzinfo=TW)) is None

    def test_multiple_days(self):
        hours = [
            StructuredHours(day=0, open=540, close=1080),
            StructuredHours(day=1, open=540, close=1080),
            StructuredHours(day=2, open=540, close=1080),
        ]
        now = datetime(2026, 3, 18, 12, 0, tzinfo=TW)  # Wednesday noon
        assert is_open_now(hours, now) is True

    def test_mixed_week_with_closed_days(self):
        hours = [
            StructuredHours(day=0, open=720, close=1110),
            StructuredHours(day=1, open=None, close=None),  # closed
            StructuredHours(day=2, open=None, close=None),  # closed
            StructuredHours(day=3, open=720, close=1110),
            StructuredHours(day=4, open=720, close=1110),
            StructuredHours(day=5, open=660, close=1110),
            StructuredHours(day=6, open=660, close=1110),
        ]
        now = datetime(2026, 3, 17, 14, 0, tzinfo=TW)  # Tuesday (closed)
        assert is_open_now(hours, now) is False

    def test_accepts_raw_dicts_from_db(self):
        """DB returns raw dicts, not Pydantic models. is_open_now must handle both."""
        hours = [{"day": 0, "open": 540, "close": 1080}]
        now = datetime(2026, 3, 16, 14, 0, tzinfo=TW)  # Monday 2pm
        assert is_open_now(hours, now) is True
