from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app
from models.types import TarotCard

client = TestClient(app)

MOCK_CARDS = [
    TarotCard(
        shop_id="s1",
        tarot_title="The Scholar's Refuge",
        flavor_text="For those who seek quiet.",
        is_open_now=True,
        distance_km=1.2,
        name="森日咖啡",
        neighborhood="台北市",
        cover_photo_url="https://example.com/photo.jpg",
        rating=4.5,
        review_count=142,
        slug="sen-ri",
    ),
]


class TestTarotDrawEndpoint:
    """GET /explore/tarot-draw returns tarot cards for nearby open shops."""

    def test_returns_200_with_valid_params(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            mock_service.return_value.draw = AsyncMock(return_value=MOCK_CARDS)
            response = client.get("/explore/tarot-draw?lat=25.033&lng=121.543")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["tarotTitle"] == "The Scholar's Refuge"
        assert data[0]["shopId"] == "s1"
        assert data[0]["isOpenNow"] is True

    def test_is_public_no_auth_required(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            mock_service.return_value.draw = AsyncMock(return_value=[])
            response = client.get("/explore/tarot-draw?lat=25.033&lng=121.543")
        assert response.status_code == 200

    def test_422_when_lat_missing(self):
        response = client.get("/explore/tarot-draw?lng=121.543")
        assert response.status_code == 422

    def test_422_when_lng_missing(self):
        response = client.get("/explore/tarot-draw?lat=25.033")
        assert response.status_code == 422

    def test_radius_defaults_to_3(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            instance = mock_service.return_value
            instance.draw = AsyncMock(return_value=[])
            client.get("/explore/tarot-draw?lat=25.033&lng=121.543")
            call_kwargs = instance.draw.call_args.kwargs
            assert call_kwargs["radius_km"] == 3.0

    def test_custom_radius(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            instance = mock_service.return_value
            instance.draw = AsyncMock(return_value=[])
            client.get("/explore/tarot-draw?lat=25.033&lng=121.543&radius_km=10")
            call_kwargs = instance.draw.call_args.kwargs
            assert call_kwargs["radius_km"] == 10.0

    def test_excluded_ids_parsed(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            instance = mock_service.return_value
            instance.draw = AsyncMock(return_value=[])
            client.get("/explore/tarot-draw?lat=25.033&lng=121.543&excluded_ids=s1,s2,s3")
            call_kwargs = instance.draw.call_args.kwargs
            assert call_kwargs["excluded_ids"] == ["s1", "s2", "s3"]

    def test_empty_excluded_ids(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.TarotService") as mock_service,
        ):
            instance = mock_service.return_value
            instance.draw = AsyncMock(return_value=[])
            client.get("/explore/tarot-draw?lat=25.033&lng=121.543&excluded_ids=")
            call_kwargs = instance.draw.call_args.kwargs
            assert call_kwargs["excluded_ids"] == []
