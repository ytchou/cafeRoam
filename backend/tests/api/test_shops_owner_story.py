from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

_BASE_SHOP_ROW = {
    "id": SHOP_ID,
    "name": "春水堂咖啡工坊",
    "slug": "chun-shui-tang-cafe",
    "address": "台北市大安區忠孝東路四段216巷27弄1號",
    "city": "Taipei",
    "mrt": "忠孝敦化站",
    "latitude": 25.0418,
    "longitude": 121.5505,
    "rating": 4.7,
    "review_count": 88,
    "description": "精品咖啡與自家烘焙，提供舒適的閱讀與工作空間。",
    "processing_status": "live",
    "mode_work": 0.9,
    "mode_rest": 0.65,
    "mode_social": 0.35,
    "community_summary": None,
    "phone": "+886-2-2771-8888",
    "website": "https://chunshuitang.tw",
    "opening_hours": {"Mon-Fri": "08:00-21:00"},
    "price_range": "$$",
    "created_at": "2025-06-01T09:00:00+00:00",
    "updated_at": "2026-03-10T12:00:00+00:00",
    "shop_photos": [{"url": "https://storage.example.com/chunshui.jpg"}],
    "shop_tags": [],
    "shop_claims": [],
}


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


class TestShopDetailOwnerStory:
    def test_shop_detail_includes_owner_story_when_published(self):
        """Shop detail response includes ownerStory when the shop has a published story."""
        shop_data = {
            **_BASE_SHOP_ROW,
            "shop_content": [
                {
                    "id": "story-uuid-001",
                    "title": "我們的故事",
                    "body": "春水堂從2008年開始，用每一杯咖啡說出台灣的故事。",
                    "photo_url": "https://storage.example.com/story.jpg",
                    "is_published": True,
                    "updated_at": "2026-02-14T10:00:00+00:00",
                    "content_type": "story",
                }
            ],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get(f"/shops/{SHOP_ID}")

        assert response.status_code == 200
        data = response.json()
        assert "ownerStory" in data
        owner_story = data["ownerStory"]
        assert owner_story is not None
        assert owner_story["id"] == "story-uuid-001"
        assert owner_story["title"] == "我們的故事"
        assert owner_story["body"] == "春水堂從2008年開始，用每一杯咖啡說出台灣的故事。"
        assert owner_story["photoUrl"] == "https://storage.example.com/story.jpg"
        assert owner_story["isPublished"] is True
        assert owner_story["updatedAt"] == "2026-02-14T10:00:00+00:00"
        # content_type must not be leaked into the response
        assert "contentType" not in owner_story
        assert "content_type" not in owner_story

    def test_shop_detail_owner_story_is_none_when_no_story(self):
        """Shop detail response has ownerStory: null when the shop has no shop_content rows."""
        shop_data = {
            **_BASE_SHOP_ROW,
            "shop_content": [],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get(f"/shops/{SHOP_ID}")

        assert response.status_code == 200
        data = response.json()
        assert "ownerStory" in data
        assert data["ownerStory"] is None

    def test_shop_detail_owner_story_is_none_when_story_is_unpublished(self):
        """Shop detail response has ownerStory: null when the story exists but is not published."""
        shop_data = {
            **_BASE_SHOP_ROW,
            "shop_content": [
                {
                    "id": "story-uuid-002",
                    "title": "草稿故事",
                    "body": "這個故事還沒準備好公開。",
                    "photo_url": None,
                    "is_published": False,
                    "updated_at": "2026-03-01T08:00:00+00:00",
                    "content_type": "story",
                }
            ],
        }
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get(f"/shops/{SHOP_ID}")

        assert response.status_code == 200
        data = response.json()
        assert "ownerStory" in data
        assert data["ownerStory"] is None

    def test_shop_detail_owner_story_is_none_when_shop_content_absent(self):
        """Shop detail response has ownerStory: null when shop_content key is missing from DB row."""
        shop_data = {k: v for k, v in _BASE_SHOP_ROW.items() if k != "shop_content"}
        shop_chain = _simple_select_chain([shop_data])

        with patch("api.shops.get_anon_client") as mock_sb:
            mock_sb.return_value = MagicMock(table=MagicMock(return_value=shop_chain))
            response = client.get(f"/shops/{SHOP_ID}")

        assert response.status_code == 200
        data = response.json()
        assert "ownerStory" in data
        assert data["ownerStory"] is None
