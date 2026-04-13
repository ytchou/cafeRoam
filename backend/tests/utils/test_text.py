from utils.text import normalize_shop_name


class TestNormalizeShopName:
    """Test shop name normalization."""

    def test_strips_trailing_parenthetical_seo_noise(self) -> None:
        """Strip common SEO noise in parentheses."""
        assert (
            normalize_shop_name("日淬 Sun Drip Coffee (完整菜單可點instagram)")
            == "日淬 Sun Drip Coffee"
        )

    def test_strips_multiple_seo_patterns(self) -> None:
        """Strip multiple common SEO patterns."""
        assert normalize_shop_name("咖啡店 (wifi/插座/不限時)") == "咖啡店"
        assert normalize_shop_name("Cafe Name (菜單/menu/IG)") == "Cafe Name"

    def test_preserves_valid_parenthetical(self) -> None:
        """Keep parentheses that are part of the name."""
        assert normalize_shop_name("星巴克 (中山店)") == "星巴克 (中山店)"
        assert normalize_shop_name("Starbucks (Zhongshan)") == "Starbucks (Zhongshan)"

    def test_handles_no_parenthetical(self) -> None:
        """Return unchanged if no trailing parenthetical."""
        assert normalize_shop_name("Simple Coffee Shop") == "Simple Coffee Shop"

    def test_handles_empty_string(self) -> None:
        """Handle empty string gracefully."""
        assert normalize_shop_name("") == ""

    def test_strips_whitespace(self) -> None:
        """Strip leading/trailing whitespace."""
        assert normalize_shop_name("  Coffee Shop  ") == "Coffee Shop"
