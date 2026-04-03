"""Tests for district explore API endpoints — mirrors test_explore.py pattern."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app
from tests.factories import make_district_row

client = TestClient(app)

MOCK_DISTRICTS = [
    make_district_row(),
    make_district_row(
        id="dist-zhongshan", slug="zhongshan", name_zh="中山區", shop_count=15, sort_order=2
    ),
]


class TestListDistrictsEndpoint:
    """GET /explore/districts — public, lists active districts."""

    def test_returns_200_with_districts(self) -> None:
        from models.types import District

        mock_svc = MagicMock()
        mock_svc.return_value.get_districts.return_value = [District(**d) for d in MOCK_DISTRICTS]

        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.DistrictService", mock_svc),
        ):
            response = client.get("/explore/districts")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["slug"] == "da-an"
        assert data[0]["shopCount"] == 42

    def test_returns_empty_list_when_no_qualifying_districts(self) -> None:
        mock_svc = MagicMock()
        mock_svc.return_value.get_districts.return_value = []

        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.DistrictService", mock_svc),
        ):
            response = client.get("/explore/districts")

        assert response.status_code == 200
        assert response.json() == []


class TestDistrictShopsEndpoint:
    """GET /explore/districts/{slug}/shops — public, shops in district."""

    def test_returns_200_with_shops(self) -> None:
        from models.types import District, DistrictShopResult, DistrictShopsResponse

        district = District(**make_district_row())
        shop = DistrictShopResult(
            shop_id="shop-d4e5f6",
            name="山小孩咖啡",
            slug="shan-xiao-hai",
            rating=4.6,
            review_count=287,
            cover_photo_url=None,
            address="台北市大安區溫州街74巷5弄2號",
            mrt="台電大樓",
        )
        mock_response = DistrictShopsResponse(district=district, shops=[shop], total_count=1)

        mock_svc = MagicMock()
        mock_svc.return_value.get_shops_for_district.return_value = mock_response

        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.DistrictService", mock_svc),
        ):
            response = client.get("/explore/districts/da-an/shops")

        assert response.status_code == 200
        data = response.json()
        assert data["district"]["slug"] == "da-an"
        assert len(data["shops"]) == 1
        assert data["totalCount"] == 1

    def test_returns_404_for_unknown_slug(self) -> None:
        mock_svc = MagicMock()
        mock_svc.return_value.get_shops_for_district.side_effect = ValueError("not found")

        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.DistrictService", mock_svc),
        ):
            response = client.get("/explore/districts/nonexistent/shops")

        assert response.status_code == 404

    def test_passes_vibe_query_param_to_service(self) -> None:
        from models.types import District, DistrictShopsResponse

        district = District(**make_district_row())
        mock_response = DistrictShopsResponse(district=district, shops=[], total_count=0)

        mock_svc = MagicMock()
        mock_svc.return_value.get_shops_for_district.return_value = mock_response

        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.DistrictService", mock_svc),
        ):
            response = client.get("/explore/districts/da-an/shops?vibe=study-cave")

        assert response.status_code == 200
        mock_svc.return_value.get_shops_for_district.assert_called_once_with(
            slug="da-an", vibe_slug="study-cave"
        )
