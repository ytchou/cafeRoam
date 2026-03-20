from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from models.types import DirectionsResult

client = TestClient(app)


class TestGetDirections:
    """GET /maps/directions returns walking or driving directions."""

    def test_returns_walking_directions(self):
        mock_result = DirectionsResult(duration_min=7, distance_m=580, profile="walking")
        with patch("api.maps.get_maps_provider") as mock_factory:
            mock_provider = AsyncMock()
            mock_provider.get_directions = AsyncMock(return_value=mock_result)
            mock_factory.return_value = mock_provider

            response = client.get(
                "/maps/directions",
                params={
                    "origin_lat": 25.04,
                    "origin_lng": 121.55,
                    "dest_lat": 25.033,
                    "dest_lng": 121.565,
                    "profile": "walking",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["durationMin"] == 7
        assert data["distanceM"] == 580
        assert data["profile"] == "walking"

    def test_returns_driving_directions(self):
        mock_result = DirectionsResult(duration_min=3, distance_m=2100, profile="driving-traffic")
        with patch("api.maps.get_maps_provider") as mock_factory:
            mock_provider = AsyncMock()
            mock_provider.get_directions = AsyncMock(return_value=mock_result)
            mock_factory.return_value = mock_provider

            response = client.get(
                "/maps/directions",
                params={
                    "origin_lat": 25.04,
                    "origin_lng": 121.55,
                    "dest_lat": 25.033,
                    "dest_lng": 121.565,
                    "profile": "driving-traffic",
                },
            )

        assert response.status_code == 200
        assert response.json()["profile"] == "driving-traffic"

    def test_returns_400_for_invalid_profile(self):
        response = client.get(
            "/maps/directions",
            params={
                "origin_lat": 25.04,
                "origin_lng": 121.55,
                "dest_lat": 25.033,
                "dest_lng": 121.565,
                "profile": "bicycling",
            },
        )
        assert response.status_code == 400

    def test_returns_502_when_upstream_fails(self):
        with patch("api.maps.get_maps_provider") as mock_factory:
            mock_provider = AsyncMock()
            mock_provider.get_directions = AsyncMock(return_value=None)
            mock_factory.return_value = mock_provider

            response = client.get(
                "/maps/directions",
                params={
                    "origin_lat": 25.04,
                    "origin_lng": 121.55,
                    "dest_lat": 25.033,
                    "dest_lng": 121.565,
                    "profile": "walking",
                },
            )

        assert response.status_code == 502
        assert "upstream" in response.json()["detail"].lower()

    def test_is_public_no_auth_required(self):
        mock_result = DirectionsResult(duration_min=5, distance_m=400, profile="walking")
        with patch("api.maps.get_maps_provider") as mock_factory:
            mock_provider = AsyncMock()
            mock_provider.get_directions = AsyncMock(return_value=mock_result)
            mock_factory.return_value = mock_provider

            response = client.get(
                "/maps/directions",
                params={
                    "origin_lat": 25.04,
                    "origin_lng": 121.55,
                    "dest_lat": 25.033,
                    "dest_lng": 121.565,
                    "profile": "walking",
                },
            )

        assert response.status_code == 200

    def test_returns_422_for_missing_params(self):
        response = client.get("/maps/directions", params={"profile": "walking"})
        assert response.status_code == 422
