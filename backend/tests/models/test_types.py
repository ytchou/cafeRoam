from datetime import datetime

import pytest

from models.types import (
    CheckIn,
    JobStatus,
    List,
    ListItem,
    SearchFilters,
    SearchQuery,
    Shop,
    ShopModeScores,
    TaxonomyTag,
)


class TestShop:
    def test_shop_required_fields(self):
        shop = Shop(
            id="shop-1",
            name="Test Cafe",
            address="123 Test St",
            latitude=25.033,
            longitude=121.565,
            review_count=10,
            taxonomy_tags=[],
            photo_urls=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert shop.id == "shop-1"
        assert shop.name == "Test Cafe"
        assert shop.mrt is None
        assert shop.phone is None
        assert shop.rating is None

    def test_shop_mode_scores(self):
        scores = ShopModeScores(work=0.8, rest=0.5, social=0.3)
        assert scores.work == 0.8


class TestTaxonomyTag:
    def test_tag_with_all_dimensions(self):
        for dim in ["functionality", "time", "ambience", "mode", "coffee"]:
            tag = TaxonomyTag(
                id=f"tag-{dim}",
                dimension=dim,  # type: ignore[arg-type]
                label=f"test-{dim}",
                label_zh=f"測試-{dim}",
            )
            assert tag.dimension == dim

    def test_invalid_dimension_rejected(self):
        with pytest.raises(ValueError):
            TaxonomyTag(
                id="tag-bad",
                dimension="invalid",  # type: ignore[arg-type]
                label="bad",
                label_zh="壞",
            )


class TestList:
    def test_list_creation(self):
        lst = List(
            id="list-1",
            user_id="user-1",
            name="Favorites",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert lst.name == "Favorites"


class TestListItem:
    def test_list_item(self):
        item = ListItem(list_id="list-1", shop_id="shop-1", added_at=datetime.now())
        assert item.list_id == "list-1"


class TestCheckIn:
    def test_checkin_requires_at_least_one_photo(self):
        checkin = CheckIn(
            id="ci-1",
            user_id="user-1",
            shop_id="shop-1",
            photo_urls=["https://example.com/photo.jpg"],
            created_at=datetime.now(),
        )
        assert len(checkin.photo_urls) >= 1

    def test_checkin_empty_photos_rejected(self):
        with pytest.raises(ValueError):
            CheckIn(
                id="ci-1",
                user_id="user-1",
                shop_id="shop-1",
                photo_urls=[],
                created_at=datetime.now(),
            )


class TestSearchQuery:
    def test_basic_query(self):
        q = SearchQuery(text="good wifi for working")
        assert q.text == "good wifi for working"
        assert q.filters is None
        assert q.limit is None

    def test_query_with_filters(self):
        q = SearchQuery(
            text="quiet cafe",
            filters=SearchFilters(
                dimensions={"ambience": ["quiet", "cozy"]},
                near_latitude=25.033,
                near_longitude=121.565,
                radius_km=2.0,
            ),
            limit=10,
        )
        assert q.filters is not None
        assert q.filters.radius_km == 2.0


class TestJobStatus:
    def test_dead_letter_status_exists(self):
        """DB has dead_letter status — Python enum must match."""
        assert JobStatus.DEAD_LETTER == "dead_letter"

    def test_all_db_statuses_covered(self):
        """Every status in the DB CHECK constraint must have a Python enum value."""
        db_statuses = {"pending", "claimed", "completed", "failed", "dead_letter"}
        enum_values = {s.value for s in JobStatus}
        assert db_statuses == enum_values
