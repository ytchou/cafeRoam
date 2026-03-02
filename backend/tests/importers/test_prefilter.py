from unittest.mock import MagicMock

from importers.prefilter import (
    PreFilterSummary,
    check_known_failed,
    fuzzy_name_similarity,
    is_fuzzy_duplicate,
    validate_google_maps_url,
    validate_shop_name,
)


class TestValidateGoogleMapsUrl:
    def test_valid_maps_google_com(self):
        assert validate_google_maps_url("https://maps.google.com/?cid=123").passed

    def test_valid_maps_google_com_with_path(self):
        assert validate_google_maps_url("https://maps.google.com/maps?q=cafe").passed

    def test_valid_google_com_maps(self):
        assert validate_google_maps_url("https://www.google.com/maps/place/abc").passed

    def test_valid_goo_gl_short_url(self):
        assert validate_google_maps_url("https://goo.gl/maps/AbCdEf").passed

    def test_valid_maps_app_goo_gl(self):
        assert validate_google_maps_url("https://maps.app.goo.gl/xyz123").passed

    def test_rejects_empty_string(self):
        result = validate_google_maps_url("")
        assert not result.passed
        assert result.reason == "invalid_url"

    def test_rejects_random_url(self):
        result = validate_google_maps_url("https://example.com/cafe")
        assert not result.passed
        assert result.reason == "invalid_url"

    def test_rejects_facebook_url(self):
        result = validate_google_maps_url("https://www.facebook.com/cafe")
        assert not result.passed

    def test_rejects_non_url_string(self):
        result = validate_google_maps_url("just a name")
        assert not result.passed


class TestValidateShopName:
    def test_valid_chinese_name(self):
        assert validate_shop_name("田田咖啡").passed

    def test_valid_english_name(self):
        assert validate_shop_name("Slow Lane Coffee").passed

    def test_valid_mixed_name(self):
        assert validate_shop_name("85°C Bakery Cafe").passed

    def test_rejects_empty(self):
        result = validate_shop_name("")
        assert not result.passed
        assert result.reason == "invalid_name"

    def test_rejects_pure_numbers(self):
        result = validate_shop_name("12345")
        assert not result.passed
        assert result.reason == "invalid_name"

    def test_rejects_pure_symbols(self):
        result = validate_shop_name("---")
        assert not result.passed

    def test_rejects_single_char(self):
        result = validate_shop_name("A")
        assert not result.passed

    def test_rejects_control_characters(self):
        result = validate_shop_name("Cafe\x00Name")
        assert not result.passed

    def test_rejects_tab_in_name(self):
        result = validate_shop_name("Cafe\tName")
        assert not result.passed


class TestFuzzyNameSimilarity:
    def test_identical_names_score_1(self):
        assert fuzzy_name_similarity("田田咖啡", "田田咖啡") == 1.0

    def test_very_similar_names_score_high(self):
        score = fuzzy_name_similarity("Slow Lane Coffee", "Slow Lane Cofee")
        assert score > 0.8

    def test_different_names_score_low(self):
        score = fuzzy_name_similarity("田田咖啡", "蟻窩咖啡")
        assert score < 0.8

    def test_case_insensitive(self):
        score = fuzzy_name_similarity("CAFE YABOO", "cafe yaboo")
        assert score == 1.0


class TestIsFuzzyDuplicate:
    _LAT = 25.033
    _LNG = 121.565

    def test_detects_near_duplicate(self):
        existing = [{"name": "田田咖啡", "latitude": 25.033, "longitude": 121.565}]
        assert is_fuzzy_duplicate("田田咖啡", self._LAT, self._LNG, existing)

    def test_allows_same_name_far_away(self):
        existing = [{"name": "田田咖啡", "latitude": 25.100, "longitude": 121.700}]
        assert not is_fuzzy_duplicate("田田咖啡", self._LAT, self._LNG, existing)

    def test_allows_different_name_nearby(self):
        existing = [{"name": "蟻窩咖啡", "latitude": 25.033, "longitude": 121.565}]
        assert not is_fuzzy_duplicate("田田咖啡", self._LAT, self._LNG, existing)

    def test_empty_existing_always_passes(self):
        assert not is_fuzzy_duplicate("任何咖啡", self._LAT, self._LNG, [])

    def test_detects_slightly_different_name_nearby(self):
        existing = [{"name": "Slow Lane Coffee", "latitude": 25.033, "longitude": 121.565}]
        # "Slow Lane Cofee" vs "Slow Lane Coffee" — should be caught
        assert is_fuzzy_duplicate("Slow Lane Cofee", self._LAT, self._LNG, existing)


class TestCheckKnownFailed:
    def test_returns_true_when_failed_shop_nearby(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.gte.return_value.lte.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[{"id": "failed-shop-1"}]
        )
        assert check_known_failed(db, 25.033, 121.565)

    def test_returns_false_when_no_failed_shop_nearby(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.gte.return_value.lte.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[]
        )
        assert not check_known_failed(db, 25.033, 121.565)


class TestPreFilterSummary:
    def test_total_rejected_sums_all_auto_reject_fields(self):
        s = PreFilterSummary(invalid_url=3, invalid_name=2, known_failed=1, closed=5)
        assert s.total_rejected() == 11

    def test_flagged_duplicates_not_counted_as_rejected(self):
        s = PreFilterSummary(flagged_duplicates=10)
        assert s.total_rejected() == 0
