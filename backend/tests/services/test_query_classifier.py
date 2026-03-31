from services.query_classifier import classify


class TestClassifyQuery:
    """When a user searches for a specific item or origin, the classifier routes
    the query to the appropriate scoring path."""

    # --- item_specific ---

    def test_chinese_food_item_classified_as_item_specific(self):
        """User searching for a specific pastry routes to item_specific scoring path."""
        assert classify("巴斯克蛋糕") == "item_specific"

    def test_chinese_drink_classified_as_item_specific(self):
        """User searching for a brewing method routes to item_specific scoring path."""
        assert classify("手沖") == "item_specific"

    def test_english_drink_classified_as_item_specific(self):
        """User searching for a drink type in English routes to item_specific scoring path."""
        assert classify("latte") == "item_specific"

    def test_english_multiword_drink_classified_as_item_specific(self):
        """Multi-word English drink query routes to item_specific scoring path."""
        assert classify("cold brew") == "item_specific"

    def test_substring_match_for_chinese_item(self):
        """User types '手沖咖啡' — classifier finds '手沖' as substring."""
        assert classify("手沖咖啡") == "item_specific"

    def test_fullwidth_input_classified_correctly(self):
        """Full-width Latin from CJK keyboard input."""
        assert classify("ｅｓｐｒｅｓｓｏ") == "item_specific"

    def test_mixed_case_english_item(self):
        """Mixed-case English input is normalized and routes to item_specific scoring path."""
        assert classify("Cappuccino") == "item_specific"

    # --- specialty_coffee ---

    def test_chinese_origin_classified_as_specialty(self):
        assert classify("耶加雪菲") == "specialty_coffee"

    def test_english_origin_classified_as_specialty(self):
        assert classify("yirgacheffe") == "specialty_coffee"

    def test_gesha_variant_classified_as_specialty(self):
        assert classify("gesha") == "specialty_coffee"

    def test_processing_method_classified_as_specialty(self):
        assert classify("日曬") == "specialty_coffee"

    def test_roast_level_classified_as_specialty(self):
        assert classify("淺焙") == "specialty_coffee"

    def test_substring_match_for_origin(self):
        """User types '耶加雪菲豆' — classifier finds '耶加雪菲' as substring."""
        assert classify("耶加雪菲豆") == "specialty_coffee"

    def test_english_origin_mixed_case(self):
        """Mixed-case English origin name routes to specialty_coffee scoring path."""
        assert classify("Ethiopia") == "specialty_coffee"

    # --- generic ---

    def test_ambience_query_is_generic(self):
        assert classify("安靜的咖啡廳") == "generic"

    def test_facility_query_is_generic(self):
        assert classify("有插座") == "generic"

    def test_location_query_is_generic(self):
        assert classify("近南京復興站") == "generic"

    # --- priority ---

    def test_item_specific_takes_priority_over_specialty(self):
        """If both match, item_specific wins."""
        assert classify("espresso single origin") == "item_specific"
