from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

SHOP_ROW = {
    "id": "shop-001",
    "name": "山小孩咖啡",
    "slug": "shan-xiao-hai-ka-fei",
    "address": "台北市大安區仁愛路四段122號",
    "latitude": 25.033,
    "longitude": 121.543,
    "rating": 4.6,
    "review_count": 100,
    "mode_work": 0.8,
    "mode_rest": 0.5,
    "mode_social": 0.3,
    "processing_status": "live",
    "community_summary": None,
    "google_place_id": "ChIJx7x7x7x7",
}


def _make_table_mock(table_responses: dict) -> MagicMock:
    """Build a mock Supabase client where table(name) returns a per-table mock chain."""

    def _table_side_effect(name: str) -> MagicMock:
        return table_responses.get(name, MagicMock())

    mock_client = MagicMock()
    mock_client.table.side_effect = _table_side_effect
    return mock_client


def _simple_select_chain(data) -> MagicMock:
    """Return a chainable mock that ends with .execute() -> data."""
    execute_mock = MagicMock(return_value=MagicMock(data=data))
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.single.return_value = chain
    chain.maybe_single.return_value = chain
    chain.order.return_value = chain
    chain.limit.return_value = chain
    chain.not_.return_value = chain
    chain.offset.return_value = chain
    chain.execute = execute_mock
    return chain


class TestShopsAPI:
    def test_list_shops_is_public(self):
        """A visitor browsing the directory can load shop listings without logging in."""
        with patch("api.shops.get_anon_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.table = MagicMock(
                return_value=MagicMock(
                    select=MagicMock(
                        return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
                    )
                )
            )
            mock_sb.return_value = mock_client
            response = client.get("/shops")
            assert response.status_code == 200

    def test_get_shop_by_id_is_public(self):
        """A visitor can view a shop detail page without logging in."""
        with patch("api.shops.get_anon_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.table = MagicMock(
                return_value=MagicMock(
                    select=MagicMock(
                        return_value=MagicMock(
                            eq=MagicMock(
                                return_value=MagicMock(
                                    single=MagicMock(
                                        return_value=MagicMock(
                                            execute=MagicMock(
                                                return_value=MagicMock(
                                                    data={
                                                        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                                        "name": "山小孩咖啡",
                                                    }
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
            mock_sb.return_value = mock_client
            response = client.get("/shops/a1b2c3d4-e5f6-7890-abcd-ef1234567890")
            assert response.status_code == 200

    def test_get_shop_detail_includes_photo_urls(self):
        """GET /shops/{id} response includes photoUrls extracted from nested shop_photos JOIN data."""
        shop_with_photos = {
            **SHOP_ROW,
            "shop_photos": [
                {"url": "https://example.com/p1.jpg"},
                {"url": "https://example.com/p2.jpg"},
            ],
            "shop_tags": [],
        }
        shop_chain = _simple_select_chain([shop_with_photos])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert data["photoUrls"] == [
            "https://example.com/p1.jpg",
            "https://example.com/p2.jpg",
        ]

    def test_get_shop_detail_returns_slug_from_db(self):
        """GET /shops/{id} returns the slug stored in the DB (set by backfill script)."""
        shop_chain = _simple_select_chain([{**SHOP_ROW, "shop_photos": [], "shop_tags": []}])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "shan-xiao-hai-ka-fei"

    def test_get_shop_detail_includes_mode_scores(self):
        """GET /shops/{id} returns modeScores dict built from mode_work/rest/social columns."""
        shop_chain = _simple_select_chain([{**SHOP_ROW, "shop_photos": [], "shop_tags": []}])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert data["modeScores"] == {"work": 0.8, "rest": 0.5, "social": 0.3}

    def test_get_shop_detail_returns_structured_taxonomy_tags(self):
        """GET /shops/{id} returns taxonomyTags as array of {id, dimension, label, labelZh}."""
        shop_data = {
            **SHOP_ROW,
            "shop_photos": [],
            "shop_tags": [
                {
                    "tag_id": "quiet",
                    "tag_name": "quiet",
                    "confidence": 0.9,
                    "taxonomy_tags": {
                        "id": "quiet",
                        "dimension": "ambience",
                        "label": "Quiet",
                        "label_zh": "安靜",
                    },
                }
            ],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        data = response.json()
        assert "taxonomyTags" in data
        assert "tags" not in data
        assert data["taxonomyTags"] == [
            {
                "id": "quiet",
                "dimension": "ambience",
                "label": "Quiet",
                "labelZh": "安靜",
                "confidence": 0.9,
            }
        ]

    def test_get_shop_detail_returns_camel_case_keys(self):
        """GET /shops/{id} response uses camelCase keys (photoUrls, modeScores, not photo_urls, mode_scores)."""
        shop_chain = _simple_select_chain(
            [
                {
                    **SHOP_ROW,
                    "shop_photos": [{"url": "https://example.com/p1.jpg"}],
                    "shop_tags": [],
                }
            ]
        )
        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        data = response.json()
        assert "photoUrls" in data
        assert "photo_urls" not in data
        assert "modeScores" in data
        assert "mode_scores" not in data

    def test_get_shop_detail_includes_community_summary(self):
        """GET /shops/{id} returns communitySummary when the shop has one."""
        shop_data = {
            **SHOP_ROW,
            "community_summary": "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。",
            "shop_photos": [],
            "shop_tags": [],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert data["communitySummary"] == "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。"

    def test_get_shop_detail_community_summary_null_when_absent(self):
        """GET /shops/{id} returns communitySummary: null when shop has no summary."""
        shop_data = {
            **SHOP_ROW,
            "shop_photos": [],
            "shop_tags": [],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert data["communitySummary"] is None

    def test_list_shops_is_open_null_when_no_hours(self):
        """GET /shops returns isOpen: null when opening_hours is absent."""
        shop_row = {
            **SHOP_ROW,
            "shop_photos": [],
            "shop_claims": [],
            "shop_tags": [],
        }
        chain = _simple_select_chain([shop_row])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=chain))
            response = client.get("/shops")

        assert response.status_code == 200
        shop = response.json()[0]
        assert shop["isOpen"] is None

    def test_user_browsing_shop_list_sees_taxonomy_tag_badges(self):
        """A user browsing the shop list sees tag badges — GET /shops must include taxonomyTags from shop_tags JOIN."""
        shop_data = [
            {
                **SHOP_ROW,
                "shop_photos": [],
                "shop_claims": [],
                "shop_tags": [
                    {
                        "tag_id": "quiet",
                        "confidence": 0.8,
                        "taxonomy_tags": {
                            "id": "quiet",
                            "dimension": "ambience",
                            "label": "Quiet",
                            "label_zh": "安靜",
                        },
                    }
                ],
            }
        ]
        chain = _simple_select_chain(shop_data)

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=chain))
            response = client.get("/shops")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "taxonomyTags" in data[0]
        assert data[0]["taxonomyTags"] == [
            {
                "id": "quiet",
                "dimension": "ambience",
                "label": "Quiet",
                "labelZh": "安靜",
                "confidence": 0.8,
            }
        ]

    def test_user_browsing_shop_list_sees_empty_tags_when_shop_has_none(self):
        """A shop with no tags returns an empty taxonomyTags array, not a missing key."""
        shop_data = [{**SHOP_ROW, "shop_photos": [], "shop_claims": [], "shop_tags": []}]
        chain = _simple_select_chain(shop_data)

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=chain))
            response = client.get("/shops")

        assert response.status_code == 200
        data = response.json()
        assert data[0]["taxonomyTags"] == []

    def test_user_browsing_shop_list_sees_empty_tags_when_join_row_is_null(self):
        """A shop with a broken shop_tags join row still shows an empty tag list, not an error."""
        shop_data = [
            {
                **SHOP_ROW,
                "shop_photos": [],
                "shop_claims": [],
                "shop_tags": [{"tag_id": "orphaned", "taxonomy_tags": None}],
            }
        ]
        chain = _simple_select_chain(shop_data)

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=chain))
            response = client.get("/shops")

        assert response.status_code == 200
        data = response.json()
        assert data[0]["taxonomyTags"] == []

    def test_list_shops_featured_returns_live_shops_only(self):
        """GET /shops?featured=true filters to processing_status=live shops."""
        live_shops = [
            {**SHOP_ROW, "id": "shop-001", "shop_photos": [], "shop_claims": [], "shop_tags": []},
            {**SHOP_ROW, "id": "shop-002", "shop_photos": [], "shop_claims": [], "shop_tags": []},
        ]

        chain = _simple_select_chain(live_shops)

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=chain))
            response = client.get("/shops?featured=true&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["taxonomyTags"] == []
        # The chain must have had .eq("processing_status", "live") applied
        chain.eq.assert_any_call("processing_status", "live")
        chain.limit.assert_called()

    def test_list_shops_includes_taxonomy_tags_and_is_open(self):
        """A shop with WiFi and open hours shows its tags and live open status in the find page response."""
        shop_data = {
            **SHOP_ROW,
            # Open 24 hours every day — structured format (post-migration DB shape)
            "opening_hours": [
                {"day": 0, "open": 0, "close": 1440},
                {"day": 1, "open": 0, "close": 1440},
                {"day": 2, "open": 0, "close": 1440},
                {"day": 3, "open": 0, "close": 1440},
                {"day": 4, "open": 0, "close": 1440},
                {"day": 5, "open": 0, "close": 1440},
                {"day": 6, "open": 0, "close": 1440},
            ],
            "shop_photos": [],
            "shop_claims": [],
            "shop_tags": [
                {
                    "tag_id": "wifi_available",
                    "confidence": 0.75,
                    "taxonomy_tags": {
                        "id": "wifi_available",
                        "dimension": "functionality",
                        "label": "WiFi Available",
                        "label_zh": "提供 WiFi",
                    },
                }
            ],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops?featured=true&limit=50")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        shop = data[0]
        assert shop["taxonomyTags"] == [
            {
                "id": "wifi_available",
                "dimension": "functionality",
                "label": "WiFi Available",
                "labelZh": "提供 WiFi",
                "confidence": 0.75,
            }
        ]
        assert shop["isOpen"] is True

    def test_get_shop_returns_google_place_id(self):
        """Shop detail response includes googlePlaceId field."""
        shop_chain = _simple_select_chain([{**SHOP_ROW, "shop_photos": [], "shop_tags": []}])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get("/shops/shop-001")

        assert response.status_code == 200
        data = response.json()
        assert "googlePlaceId" in data


@pytest.fixture
def mock_shop_row():
    """Realistic shop row as returned by Supabase."""
    return {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Café Flâneur",
        "slug": "cafe-flaneur",
        "address": "台北市大安區復興南路一段219巷18號",
        "city": "Taipei",
        "mrt": "大安站",
        "latitude": 25.0339,
        "longitude": 121.5436,
        "rating": 4.5,
        "review_count": 42,
        "description": "A quiet corner for deep work and pour-over coffee.",
        "processing_status": "live",
        "mode_work": 0.85,
        "mode_rest": 0.60,
        "mode_social": 0.40,
        "created_at": "2026-01-15T10:00:00+00:00",
        "phone": "+886-2-2700-1234",
        "website": "https://cafeflaneur.tw",
        "opening_hours": {"Mon": "08:00-18:00", "Tue": "08:00-18:00"},
        "price_range": "$$",
        "updated_at": "2026-03-20T14:30:00+00:00",
        "shop_photos": [{"url": "https://storage.example.com/photo1.jpg"}],
        "shop_tags": [
            {
                "tag_id": "laptop_friendly",
                "confidence": 0.85,
                "taxonomy_tags": {
                    "id": "laptop_friendly",
                    "dimension": "functionality",
                    "label": "Laptop Friendly",
                    "label_zh": "適合帶筆電",
                },
            }
        ],
    }


class TestGetShopSeoFields:
    """GET /shops/{shop_id} returns SEO-enrichment fields."""

    @patch("api.shops.get_anon_client")
    def test_shop_response_includes_seo_fields(
        self, mock_get_client: MagicMock, mock_shop_row: dict
    ):
        """When fetching a shop, response includes phone, website, openingHours, priceRange, and updatedAt for JSON-LD."""
        mock_db = MagicMock()
        mock_get_client.return_value = mock_db
        mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[mock_shop_row]
        )

        response = client.get(f"/shops/{mock_shop_row['id']}")
        assert response.status_code == 200
        data = response.json()

        # New SEO fields
        assert data["phone"] == "+886-2-2700-1234"
        assert data["website"] == "https://cafeflaneur.tw"
        assert "openingHours" not in data
        assert data["priceRange"] == "$$"
        assert data["updatedAt"] == "2026-03-20T14:30:00+00:00"

        # Existing fields still present
        assert data["name"] == "Café Flâneur"
        assert data["modeScores"]["work"] == 0.85
        assert len(data["taxonomyTags"]) == 1


class TestExtractTaxonomyTags:
    """Unit tests for confidence threshold filtering in _extract_taxonomy_tags."""

    def setup_method(self):
        from api.shops import _extract_taxonomy_tags

        self._fn = _extract_taxonomy_tags

    def test_given_shop_with_mixed_confidence_tags_only_high_confidence_tags_are_shown(self):
        raw_tags = [
            {
                "confidence": 0.8,
                "taxonomy_tags": {
                    "id": "quiet_ambience",
                    "dimension": "ambience",
                    "label": "Quiet Ambience",
                    "label_zh": "安靜氛圍",
                },
            },
            {
                "confidence": 0.3,
                "taxonomy_tags": {
                    "id": "good_wifi",
                    "dimension": "functionality",
                    "label": "Good WiFi",
                    "label_zh": "穩定WiFi",
                },
            },
        ]
        result = self._fn(raw_tags)
        assert len(result) == 1
        assert result[0]["id"] == "quiet_ambience"

    def test_given_tag_at_exactly_threshold_it_is_included(self):
        raw_tags = [
            {
                "confidence": 0.5,
                "taxonomy_tags": {
                    "id": "laptop_friendly",
                    "dimension": "functionality",
                    "label": "Laptop Friendly",
                    "label_zh": "適合帶筆電",
                },
            },
        ]
        result = self._fn(raw_tags)
        assert len(result) == 1
        assert result[0]["confidence"] == 0.5

    def test_given_tag_with_none_confidence_it_is_filtered_out(self):
        raw_tags = [
            {
                "confidence": None,
                "taxonomy_tags": {
                    "id": "pet_friendly",
                    "dimension": "functionality",
                    "label": "Pet Friendly",
                    "label_zh": "寵物友善",
                },
            },
        ]
        result = self._fn(raw_tags)
        assert result == []

    def test_confidence_value_is_included_in_api_output(self):
        raw_tags = [
            {
                "confidence": 0.75,
                "taxonomy_tags": {
                    "id": "cozy_seating",
                    "dimension": "ambience",
                    "label": "Cozy Seating",
                    "label_zh": "舒適座位",
                },
            },
        ]
        result = self._fn(raw_tags)
        assert result[0]["confidence"] == 0.75
