from datetime import datetime
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from services.tarot_service import TarotService
from tests.factories import make_tarot_shop_row

TW = ZoneInfo("Asia/Taipei")

# Fixed "now" on a Wednesday at 2pm — all default factory shops should be open
FIXED_NOW = datetime(2026, 3, 18, 14, 0, tzinfo=TW)


def _make_db_mock(rows: list[dict], district_names: list[str] | None = None) -> MagicMock:
    """Mock Supabase client that returns given rows from table select.

    When district_names is provided, the first execute() returns district name_zh rows
    (for the UUID→name translation query) and the second returns the shop rows.
    """
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.in_.return_value = mock
    mock.not_ = mock  # property access, not call — mirrors supabase-py chaining
    mock.is_.return_value = mock
    mock.gte.return_value = mock
    mock.lte.return_value = mock
    mock.limit.return_value = mock
    if district_names is not None:
        district_rows = [{"name_zh": n} for n in district_names]
        mock.execute.side_effect = [
            MagicMock(data=district_rows),  # districts UUID→name_zh lookup
            MagicMock(data=rows),  # shops query
        ]
    else:
        mock.execute.return_value = MagicMock(data=rows)
    return mock


class TestTarotServiceDraw:
    """Given a user location, draw 3 unique-title tarot cards from nearby open shops."""

    async def test_returns_3_cards_from_sufficient_pool(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
            make_tarot_shop_row(id="s2", tarot_title="The Hidden Alcove"),
            make_tarot_shop_row(id="s3", tarot_title="The Alchemist's Table"),
            make_tarot_shop_row(id="s4", tarot_title="The Open Sky"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert len(result) == 3

    async def test_all_cards_have_unique_titles(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
            make_tarot_shop_row(id="s2", tarot_title="The Scholar's Refuge"),
            make_tarot_shop_row(id="s3", tarot_title="The Hidden Alcove"),
            make_tarot_shop_row(id="s4", tarot_title="The Alchemist's Table"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        titles = [c.tarot_title for c in result]
        assert len(titles) == len(set(titles))

    async def test_excludes_recently_seen_shops(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
            make_tarot_shop_row(id="s2", tarot_title="The Hidden Alcove"),
            make_tarot_shop_row(id="s3", tarot_title="The Alchemist's Table"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=["s1", "s2"], now=FIXED_NOW
        )
        result_ids = [c.shop_id for c in result]
        assert "s1" not in result_ids
        assert "s2" not in result_ids

    async def test_returns_fewer_than_3_when_pool_is_small(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert len(result) == 1

    async def test_returns_empty_list_when_no_shops(self):
        db = _make_db_mock([])
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert result == []

    async def test_filters_out_closed_shops(self):
        # Shop explicitly closed Wednesday should be excluded; unlisted hours are unknown (included)
        rows = [
            make_tarot_shop_row(
                id="s1",
                tarot_title="The Scholar's Refuge",
                opening_hours=[{"day": 2, "open": None, "close": None}],
            ),
            make_tarot_shop_row(id="s2", tarot_title="The Hidden Alcove"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        result_ids = [c.shop_id for c in result]
        assert "s1" not in result_ids

    async def test_includes_shop_with_unlisted_day_hours(self):
        """A shop that only lists Sunday hours returns None (unknown) on Wednesday — included."""
        rows = [
            make_tarot_shop_row(
                id="s1",
                tarot_title="The Scholar's Refuge",
                opening_hours=[{"day": 6, "open": 540, "close": 1020}],
            ),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert len(result) == 1  # unknown hours on this day = included

    async def test_includes_shops_with_null_hours_as_unknown(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge", opening_hours=None),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert len(result) == 1  # null hours = unknown = included

    async def test_card_has_distance_km(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        assert result[0].distance_km >= 0

    async def test_card_response_shape(self):
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Scholar's Refuge"),
        ]
        db = _make_db_mock(rows)
        service = TarotService(db)
        result = await service.draw(
            lat=25.033, lng=121.543, radius_km=3.0, excluded_ids=[], now=FIXED_NOW
        )
        card = result[0]
        assert card.shop_id == "s1"
        assert card.tarot_title == "The Scholar's Refuge"
        assert card.flavor_text == "For those who seek quiet in an unquiet world."
        assert card.name == "森日咖啡"
        assert card.neighborhood == "台北市"


class TestTarotServiceDrawByDistrict:
    """Given shops in a district, draw tarot cards filtered by district text field."""

    async def test_draw_by_district_id_returns_cards(self):
        """Given shops in a district, when drawing by district_id, then returns up to 3 cards."""
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Wanderer"),
            make_tarot_shop_row(id="s2", tarot_title="The Artisan"),
            make_tarot_shop_row(id="s3", tarot_title="The Scholar"),
        ]
        db = _make_db_mock(rows, district_names=["大安區"])
        service = TarotService(db)
        cards = await service.draw(
            lat=None,
            lng=None,
            radius_km=3.0,
            excluded_ids=[],
            district_ids=["district-123"],
        )
        assert len(cards) <= 3
        assert all(c.distance_km == 0.0 for c in cards)

    async def test_draw_by_district_id_excludes_ids(self):
        """Given excluded IDs, when drawing by district, then those shops are skipped."""
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Wanderer"),
            make_tarot_shop_row(id="s2", tarot_title="The Artisan"),
        ]
        db = _make_db_mock(rows, district_names=["大安區"])
        service = TarotService(db)
        cards = await service.draw(
            lat=None,
            lng=None,
            radius_km=3.0,
            excluded_ids=["s1"],
            district_ids=["district-123"],
        )
        assert all(c.shop_id != "s1" for c in cards)

    async def test_draw_district_mode_distance_is_zero(self):
        """When drawing by district (no lat/lng), distance_km is always 0.0."""
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Wanderer"),
        ]
        db = _make_db_mock(rows, district_names=["大安區"])
        service = TarotService(db)
        cards = await service.draw(
            lat=None,
            lng=None,
            radius_km=3.0,
            excluded_ids=[],
            district_ids=["district-123"],
        )
        assert cards[0].distance_km == 0.0

    async def test_draw_by_multiple_district_ids(self):
        """Given multiple district IDs, when drawing by districts, then returns cards from the pool."""
        rows = [
            make_tarot_shop_row(id="s1", tarot_title="The Wanderer"),
            make_tarot_shop_row(id="s2", tarot_title="The Artisan"),
        ]
        db = _make_db_mock(rows, district_names=["大安區", "信義區"])
        service = TarotService(db)
        cards = await service.draw(
            lat=None,
            lng=None,
            radius_km=3.0,
            excluded_ids=[],
            district_ids=["district-111", "district-222"],
        )
        assert len(cards) <= 3
        assert all(c.distance_km == 0.0 for c in cards)
