from datetime import datetime

from models.types import CheckIn, List, ListItem, Shop, Stamp, User

from tests.factories import (
    make_checkin,
    make_list,
    make_list_item,
    make_shop_row,
    make_stamp,
    make_user,
)


class TestFactories:
    def test_make_user_returns_valid_user(self):
        data = make_user()
        user = User(**data)
        assert user.id.startswith("user-")
        assert "@" in user.email

    def test_make_user_accepts_overrides(self):
        data = make_user(email="custom@example.com", display_name="Custom Name")
        assert data["email"] == "custom@example.com"
        assert data["display_name"] == "Custom Name"

    def test_make_shop_row_returns_valid_shop(self):
        data = make_shop_row()
        # Shop model doesn't expect similarity/tag_ids, so pop them
        similarity = data.pop("similarity")
        data.pop("tag_ids")
        shop = Shop(**data)
        assert shop.name != "Test Cafe"  # Must be realistic, not placeholder
        assert similarity == 0.85

    def test_make_list_returns_valid_list(self):
        data = make_list()
        lst = List(**data)
        assert lst.user_id.startswith("user-")

    def test_make_checkin_returns_valid_checkin(self):
        data = make_checkin()
        ci = CheckIn(**data)
        assert len(ci.photo_urls) >= 1

    def test_make_stamp_returns_valid_stamp(self):
        data = make_stamp()
        stamp = Stamp(**data)
        assert stamp.design_url.startswith("https://")

    def test_make_list_item_returns_valid_list_item(self):
        data = make_list_item()
        item = ListItem(**data)
        assert item.list_id.startswith("list-")
