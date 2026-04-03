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


class TestReverseMatchClassification:
    """When a user types a partial term that is a substring of a vocabulary
    entry, the classifier still routes to the correct scoring path."""

    # --- item_specific via reverse ---

    def test_partial_chinese_food_term_classified_as_item_specific(self):
        """User types '巴斯克' (short for 巴斯克蛋糕) — reverse match triggers item_specific."""
        assert classify("巴斯克") == "item_specific"

    def test_partial_chinese_drink_term_classified_as_item_specific(self):
        """User types '西西里' (short for 西西里咖啡) — reverse match triggers item_specific."""
        assert classify("西西里") == "item_specific"

    def test_generic_coffee_term_classified_via_reverse(self):
        """User types '咖啡' — matches '西西里咖啡' in ITEM_TERMS via reverse."""
        assert classify("咖啡") == "item_specific"

    def test_partial_english_food_term_classified_as_item_specific(self):
        """User types 'basque' — matches 'basque cheesecake' via reverse."""
        assert classify("basque") == "item_specific"

    # --- minimum length guard ---

    def test_single_cjk_char_stays_generic(self):
        """Single CJK character '蛋' should NOT match '巴斯克蛋糕' — below 2-char minimum."""
        assert classify("蛋") == "generic"

    def test_single_cjk_char_na_stays_generic(self):
        """Single CJK character '拿' should NOT match '拿鐵' — below 2-char minimum."""
        assert classify("拿") == "generic"

    def test_short_english_stays_generic(self):
        """Two-letter English 'ba' should NOT match 'basque cheesecake' — below 3-char minimum."""
        assert classify("ba") == "generic"

    # --- priority: item reverse > specialty forward ---

    def test_item_reverse_beats_specialty_forward(self):
        """If a query reverse-matches ITEM_TERMS, it wins over a forward SPECIALTY_TERMS match."""
        # "咖啡" reverse-matches "西西里咖啡" in ITEM_TERMS → item_specific
        # even though "精品咖啡" in SPECIALTY_TERMS also contains "咖啡"
        assert classify("咖啡") == "item_specific"
