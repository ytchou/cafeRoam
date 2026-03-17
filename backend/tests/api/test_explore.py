from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from models.types import TarotCard, VibeCollection, VibeShopResult, VibeShopsResponse

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


# ── Vibe Collections ──────────────────────────────────────────────────────────

MOCK_VIBES = [
    VibeCollection(
        id="vibe-1",
        slug="study-cave",
        name="Study Cave",
        name_zh="讀書洞穴",
        emoji="📚",
        subtitle="Quiet · WiFi",
        subtitle_zh="安靜 · 有網路",
        tag_ids=["quiet", "laptop_friendly"],
        sort_order=1,
    )
]

MOCK_VIBE_SHOPS_RESPONSE = VibeShopsResponse(
    vibe=MOCK_VIBES[0],
    shops=[
        VibeShopResult(
            shop_id="shop-a",
            name="森日咖啡",
            slug="sen-ri",
            rating=4.5,
            review_count=120,
            cover_photo_url=None,
            distance_km=None,
            overlap_score=0.75,
            matched_tag_labels=[],
        )
    ],
    total_count=1,
)


class TestVibesListEndpoint:
    """GET /explore/vibes returns all active vibe collections."""

    def test_returns_200_with_vibes_list(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_vibes.return_value = MOCK_VIBES
            response = client.get("/explore/vibes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["slug"] == "study-cave"
        assert data[0]["nameZh"] == "讀書洞穴"

    def test_is_public_no_auth_required(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_vibes.return_value = []
            response = client.get("/explore/vibes")
        assert response.status_code == 200

    def test_returns_empty_list_when_no_vibes(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_vibes.return_value = []
            response = client.get("/explore/vibes")
        assert response.json() == []


class TestVibeShopsEndpoint:
    """GET /explore/vibes/{slug}/shops returns shops matching a vibe."""

    def test_returns_200_with_shops(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_shops_for_vibe.return_value = MOCK_VIBE_SHOPS_RESPONSE
            response = client.get("/explore/vibes/study-cave/shops")
        assert response.status_code == 200
        data = response.json()
        assert data["totalCount"] == 1
        assert data["shops"][0]["shopId"] == "shop-a"
        assert data["vibe"]["slug"] == "study-cave"

    def test_returns_404_for_unknown_slug(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_shops_for_vibe.side_effect = ValueError(
                "Vibe 'unknown' not found"
            )
            response = client.get("/explore/vibes/unknown/shops")
        assert response.status_code == 404

    def test_accepts_optional_geo_params(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_shops_for_vibe.return_value = MOCK_VIBE_SHOPS_RESPONSE
            response = client.get(
                "/explore/vibes/study-cave/shops?lat=25.033&lng=121.543&radius_km=3"
            )
        assert response.status_code == 200
        call_kwargs = mock_svc.return_value.get_shops_for_vibe.call_args.kwargs
        assert call_kwargs["lat"] == pytest.approx(25.033)
        assert call_kwargs["lng"] == pytest.approx(121.543)
        assert call_kwargs["radius_km"] == pytest.approx(3.0)

    def test_works_without_geo_params(self):
        with (
            patch("api.explore.get_anon_client", return_value=MagicMock()),
            patch("api.explore.VibeService") as mock_svc,
        ):
            mock_svc.return_value.get_shops_for_vibe.return_value = MOCK_VIBE_SHOPS_RESPONSE
            response = client.get("/explore/vibes/study-cave/shops")
        assert response.status_code == 200
        call_kwargs = mock_svc.return_value.get_shops_for_vibe.call_args.kwargs
        assert call_kwargs["lat"] is None
        assert call_kwargs["lng"] is None
