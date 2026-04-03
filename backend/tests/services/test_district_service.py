"""Tests for DistrictService — mirrors test_vibe_service.py pattern."""

from unittest.mock import MagicMock

import pytest

from tests.factories import make_district_row, make_district_shop_row, make_shop_tag_row

# ── Helpers ──────────────────────────────────────────────────────

def _chain_mock() -> MagicMock:
    """Return a mock that supports Supabase query chaining."""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.gte.return_value = mock
    mock.in_.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.is_.return_value = mock
    return mock


# ── TestDistrictServiceGetDistricts ──────────────────────────────

class TestDistrictServiceGetDistricts:
    """get_districts returns active districts with enough shops."""

    def test_returns_active_districts_above_threshold(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        db.execute.return_value = MagicMock(
            data=[
                make_district_row(shop_count=10),
                make_district_row(id="dist-zhongshan", slug="zhongshan", name_zh="中山區", shop_count=5, sort_order=2),
            ]
        )
        service = DistrictService(db)
        result = service.get_districts(min_shops=3)
        assert len(result) == 2
        assert result[0].slug == "da-an"
        assert result[0].shop_count == 10

    def test_excludes_districts_below_threshold(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        db.execute.return_value = MagicMock(
            data=[
                make_district_row(shop_count=2),
            ]
        )
        service = DistrictService(db)
        result = service.get_districts(min_shops=3)
        assert len(result) == 0

    def test_returns_empty_list_when_no_districts(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        db.execute.return_value = MagicMock(data=[])
        service = DistrictService(db)
        result = service.get_districts()
        assert result == []


# ── TestDistrictServiceGetShopsForDistrict ───────────────────────

class TestDistrictServiceGetShopsForDistrict:
    """get_shops_for_district returns shops in a district, with optional vibe filter."""

    def test_returns_shops_in_district(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        district = make_district_row()
        shop = make_district_shop_row()

        db.execute.side_effect = [
            MagicMock(data=[district]),
            MagicMock(data=[shop]),
        ]
        service = DistrictService(db)
        result = service.get_shops_for_district("da-an")
        assert result.district.slug == "da-an"
        assert len(result.shops) == 1
        assert result.shops[0].name == "山小孩咖啡"
        assert result.total_count == 1

    def test_raises_for_unknown_slug(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        db.execute.return_value = MagicMock(data=[])
        service = DistrictService(db)
        with pytest.raises(ValueError, match="not found"):
            service.get_shops_for_district("nonexistent")

    def test_returns_empty_shops_for_district_with_no_live_shops(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        district = make_district_row(shop_count=0)
        db.execute.side_effect = [
            MagicMock(data=[district]),
            MagicMock(data=[]),
        ]
        service = DistrictService(db)
        result = service.get_shops_for_district("da-an")
        assert result.shops == []
        assert result.total_count == 0

    def test_applies_vibe_filter_when_provided(self) -> None:
        from services.district_service import DistrictService

        db = _chain_mock()
        district = make_district_row()
        vibe = {"id": "vibe-study", "slug": "study-cave", "tag_ids": ["quiet", "wifi_available"]}
        shop = make_district_shop_row()
        tag_row = make_shop_tag_row(shop_id="shop-d4e5f6", tag_id="quiet")

        db.execute.side_effect = [
            MagicMock(data=[district]),
            MagicMock(data=[vibe]),
            MagicMock(data=[tag_row]),
            MagicMock(data=[shop]),
            MagicMock(data=[]),
        ]
        service = DistrictService(db)
        result = service.get_shops_for_district("da-an", vibe_slug="study-cave")
        assert len(result.shops) == 1
        assert result.shops[0].matched_tag_labels == ["quiet"]
