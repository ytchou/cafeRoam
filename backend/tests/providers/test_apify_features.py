"""Tests for ApifyScraperAdapter._extract_maps_features."""

from providers.scraper.apify_adapter import ApifyScraperAdapter


class TestExtractMapsFeatures:
    """Tests for _extract_maps_features static method."""

    def test_extracts_known_features_from_standard_additional_info_structure(self):
        """Given a standard Apify additionalInfo payload, returns matching tag ids for true values."""
        place = {
            "additionalInfo": {
                "Service options": {"Outdoor seating": True, "Takeout": True, "Dine-in": True},
                "Accessibility": {"Wheelchair-accessible entrance": True},
                "Amenities": {"Wi-Fi": True},
            }
        }

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {
            "outdoor_seating": True,
            "takeout": True,
            "dine_in": True,
            "wheelchair_accessible": True,
            "wifi": True,
        }

    def test_excludes_false_values(self):
        """Given features with false values, excludes them from the result."""
        place = {
            "additionalInfo": {
                "Service options": {
                    "Outdoor seating": True,
                    "Takeout": False,
                    "Dine-in": False,
                },
            }
        }

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {"outdoor_seating": True}
        assert "takeout" not in result
        assert "dine_in" not in result

    def test_ignores_unknown_keys(self):
        """Given feature keys not in the mapping, they are silently ignored."""
        place = {
            "additionalInfo": {
                "Service options": {
                    "Curbside pickup": True,
                    "No-contact delivery": True,
                    "Outdoor seating": True,
                },
            }
        }

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {"outdoor_seating": True}

    def test_returns_empty_dict_for_empty_additional_info(self):
        """Given an empty additionalInfo dict, returns an empty dict."""
        place = {"additionalInfo": {}}

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {}

    def test_returns_empty_dict_when_additional_info_missing(self):
        """Given a place dict with no additionalInfo key, returns an empty dict."""
        place = {"title": "Sunrise Coffee", "address": "台北市"}

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {}

    def test_returns_empty_dict_when_additional_info_is_none(self):
        """Given additionalInfo=None, returns an empty dict without errors."""
        place = {"additionalInfo": None}

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {}

    def test_handles_mixed_categories_with_partial_matches(self):
        """Given multiple categories, only returns tags that match the feature map."""
        place = {
            "additionalInfo": {
                "Service options": {"Takeout": True, "Delivery": True},
                "Accessibility": {"Wheelchair-accessible entrance": False},
                "Amenities": {"Wi-Fi": True, "Restroom": True},
                "Payments": {"Credit cards": True},
            }
        }

        result = ApifyScraperAdapter._extract_maps_features(place)

        assert result == {"takeout": True, "wifi": True}
