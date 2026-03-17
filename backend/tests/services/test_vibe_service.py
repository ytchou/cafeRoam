import pytest
from unittest.mock import MagicMock

from services.vibe_service import VibeService
from tests.factories import make_vibe_row, make_shop_tag_row, make_tarot_shop_row


def _make_db_mock_for_vibes(
    vibe_rows: list[dict],
    tag_rows: list[dict],
    shop_rows: list[dict],
) -> MagicMock:
    """Mock that sequences calls: first to vibe_collections, then shop_tags, then shops."""
    mock = MagicMock()
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.eq.return_value = mock
    mock.in_.return_value = mock
    mock.order.return_value = mock
    mock.gte.return_value = mock
    mock.lte.return_value = mock
    mock.limit.return_value = mock
    mock.not_.return_value = mock

    # Sequence .execute() calls in order: vibes → tags → shops
    execute_mock = MagicMock()
    execute_mock.side_effect = [
        MagicMock(data=vibe_rows),   # 1st call: vibe_collections query
        MagicMock(data=tag_rows),    # 2nd call: shop_tags query
        MagicMock(data=shop_rows),   # 3rd call: shops query
    ]
    mock.execute = execute_mock
    return mock


class TestVibeServiceGetVibes:
    """Given the vibes endpoint is called, return all active vibe collections in order."""

    def test_returns_active_vibes_ordered_by_sort_order(self):
        rows = [
            make_vibe_row(slug="study-cave", sort_order=1),
            make_vibe_row(slug="first-date", sort_order=2),
        ]
        mock = MagicMock()
        mock.table.return_value = mock
        mock.select.return_value = mock
        mock.eq.return_value = mock
        mock.order.return_value = mock
        mock.execute.return_value = MagicMock(data=rows)

        service = VibeService(mock)
        result = service.get_vibes()

        assert len(result) == 2
        assert result[0].slug == "study-cave"
        assert result[1].slug == "first-date"

    def test_returns_empty_list_when_no_vibes(self):
        mock = MagicMock()
        mock.table.return_value = mock
        mock.select.return_value = mock
        mock.eq.return_value = mock
        mock.order.return_value = mock
        mock.execute.return_value = MagicMock(data=[])

        service = VibeService(mock)
        result = service.get_vibes()
        assert result == []


class TestVibeServiceGetShopsForVibe:
    """Given a vibe slug and optional location, return matching shops ranked by tag overlap."""

    def test_returns_shops_with_overlap_score(self):
        vibe = make_vibe_row(
            tag_ids=["quiet", "laptop_friendly", "wifi_available", "no_time_limit"]
        )
        # Shop has 3 of the 4 vibe tags
        tag_rows = [
            make_shop_tag_row("shop-a", "quiet"),
            make_shop_tag_row("shop-a", "laptop_friendly"),
            make_shop_tag_row("shop-a", "wifi_available"),
        ]
        shop_rows = [
            {**make_tarot_shop_row(id="shop-a"), "shop_photos": []},
        ]
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave")

        assert len(result.shops) == 1
        assert result.shops[0].shop_id == "shop-a"
        assert result.shops[0].overlap_score == pytest.approx(3 / 4)

    def test_excludes_shops_with_zero_overlap(self):
        vibe = make_vibe_row(tag_ids=["quiet", "laptop_friendly"])
        # No shops match any vibe tag
        db = _make_db_mock_for_vibes([vibe], [], [])

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave")
        assert result.shops == []

    def test_sorts_by_overlap_score_descending(self):
        vibe = make_vibe_row(tag_ids=["quiet", "laptop_friendly", "wifi_available"])
        tag_rows = [
            make_shop_tag_row("shop-a", "quiet"),
            make_shop_tag_row("shop-a", "laptop_friendly"),
            make_shop_tag_row("shop-a", "wifi_available"),
            make_shop_tag_row("shop-b", "quiet"),
        ]
        shop_rows = [
            {**make_tarot_shop_row(id="shop-a"), "shop_photos": []},
            {**make_tarot_shop_row(id="shop-b"), "shop_photos": []},
        ]
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave")

        assert result.shops[0].shop_id == "shop-a"
        assert result.shops[0].overlap_score > result.shops[1].overlap_score

    def test_raises_404_for_unknown_slug(self):
        from fastapi import HTTPException

        mock = MagicMock()
        mock.table.return_value = mock
        mock.select.return_value = mock
        mock.eq.return_value = mock
        mock.order.return_value = mock
        mock.execute.return_value = MagicMock(data=[])

        service = VibeService(mock)
        with pytest.raises(HTTPException) as exc_info:
            service.get_shops_for_vibe("nonexistent-slug")
        assert exc_info.value.status_code == 404

    def test_adds_distance_km_when_lat_lng_provided(self):
        vibe = make_vibe_row(tag_ids=["quiet"])
        tag_rows = [make_shop_tag_row("shop-a", "quiet")]
        shop_rows = [{**make_tarot_shop_row(id="shop-a"), "shop_photos": []}]
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave", lat=25.033, lng=121.543)

        assert result.shops[0].distance_km is not None
        assert result.shops[0].distance_km >= 0

    def test_distance_km_is_none_without_geo_params(self):
        vibe = make_vibe_row(tag_ids=["quiet"])
        tag_rows = [make_shop_tag_row("shop-a", "quiet")]
        shop_rows = [{**make_tarot_shop_row(id="shop-a"), "shop_photos": []}]
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave")

        assert result.shops[0].distance_km is None

    def test_excludes_shops_with_null_coords_when_geo_active(self):
        vibe = make_vibe_row(tag_ids=["quiet"])
        tag_rows = [make_shop_tag_row("shop-a", "quiet")]
        # shop with null lat/lng — should be filtered before shop query via PostgREST
        shop_rows = []  # geo filter would exclude this shop
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave", lat=25.033, lng=121.543)
        assert result.shops == []

    def test_total_count_matches_shops_length(self):
        vibe = make_vibe_row(tag_ids=["quiet"])
        tag_rows = [make_shop_tag_row("shop-a", "quiet")]
        shop_rows = [{**make_tarot_shop_row(id="shop-a"), "shop_photos": []}]
        db = _make_db_mock_for_vibes([vibe], tag_rows, shop_rows)

        service = VibeService(db)
        result = service.get_shops_for_vibe("study-cave")
        assert result.total_count == len(result.shops)
