from services.query_classifier import classify


class TestClassify:
    """Given a search query, classify returns the query type."""

    def test_food_item_returns_item_specific(self):
        """When a user searches for a specific food, it's classified as item_specific."""
        assert classify("巴斯克蛋糕") == "item_specific"

    def test_drink_item_returns_item_specific(self):
        """When a user searches for a specific drink, it's classified as item_specific."""
        assert classify("拿鐵") == "item_specific"

    def test_brew_method_returns_item_specific(self):
        """When a user searches for a brew method, it's classified as item_specific."""
        assert classify("手沖") == "item_specific"

    def test_pastry_returns_item_specific(self):
        """When a user searches for a pastry, it's classified as item_specific."""
        assert classify("司康") == "item_specific"

    def test_coffee_origin_returns_specialty_coffee(self):
        """When a user searches for a coffee origin, it's classified as specialty_coffee."""
        assert classify("衣索比亞") == "specialty_coffee"

    def test_roast_level_returns_specialty_coffee(self):
        """When a user searches for a roast level, it's classified as specialty_coffee."""
        assert classify("淺焙") == "specialty_coffee"

    def test_single_origin_returns_specialty_coffee(self):
        """When a user searches for single origin coffee, it's classified as specialty_coffee."""
        assert classify("單品咖啡") == "specialty_coffee"

    def test_generic_query_returns_generic(self):
        """When a user searches for atmosphere or vibe, it's classified as generic."""
        assert classify("安靜適合工作") == "generic"

    def test_wifi_query_returns_generic(self):
        """When a user searches for wifi, it's classified as generic."""
        assert classify("good wifi") == "generic"

    def test_mixed_query_with_food_returns_item_specific(self):
        """When a query contains a food term mixed with generic words, item_specific wins."""
        assert classify("有賣司康的安靜咖啡店") == "item_specific"

    def test_mixed_query_specialty_over_generic(self):
        """When a query contains a specialty term mixed with generic words, specialty_coffee wins."""
        assert classify("有單品的咖啡店") == "specialty_coffee"

    def test_empty_string_returns_generic(self):
        """An empty query is classified as generic."""
        assert classify("") == "generic"

    def test_english_latte_returns_item_specific(self):
        """English food/drink terms are also classified."""
        assert classify("latte") == "item_specific"

    def test_item_specific_takes_priority_over_specialty(self):
        """When a query contains both food and specialty terms, item_specific wins."""
        assert classify("手沖 衣索比亞") == "item_specific"
