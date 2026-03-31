from services.query_normalizer import hash_cache_key, normalize_query


class TestNormalizeQuery:
    def test_lowercases_text(self):
        assert normalize_query("Good WiFi COFFEE") == "good wifi coffee"

    def test_strips_whitespace(self):
        assert normalize_query("  good coffee  ") == "good coffee"

    def test_collapses_internal_whitespace(self):
        assert normalize_query("good   wifi   coffee") == "good wifi coffee"

    def test_removes_trailing_punctuation(self):
        assert normalize_query("好喝咖啡?") == "好喝咖啡"
        assert normalize_query("nice coffee!") == "nice coffee"
        assert normalize_query("café nearby.") == "café nearby"

    def test_handles_chinese_text(self):
        assert normalize_query("  大安區  好咖啡  ") == "大安區 好咖啡"

    def test_empty_after_strip_returns_empty(self):
        assert normalize_query("   ") == ""

    def test_mixed_punctuation_only_removes_trailing(self):
        assert normalize_query("what's good?") == "what's good"

    def test_converts_fullwidth_latin_to_halfwidth(self):
        """When a user types full-width Latin characters (common on CJK keyboards), they normalize to ASCII."""
        assert normalize_query("ｅｓｐｒｅｓｓｏ") == "espresso"
        assert normalize_query("ＬＡＴＴＥ") == "latte"

    def test_converts_fullwidth_digits_to_halfwidth(self):
        """Full-width digits from CJK input methods normalize to standard digits."""
        assert normalize_query("１２３") == "123"
        assert normalize_query("店 ３樓") == "店 3樓"

    def test_fullwidth_katakana_preserved(self):
        """NFKC keeps full-width katakana as-is (they are already canonical)."""
        assert normalize_query("カフェラテ") == "カフェラテ"

    def test_nfkc_combined_with_other_normalizations(self):
        """Full-width input still gets lowercased, trimmed, and punctuation-stripped."""
        assert normalize_query("  Ｅｓｐｒｅｓｓｏ  ？") == "espresso"


class TestHashCacheKey:
    def test_deterministic_for_same_input(self):
        h1 = hash_cache_key("good coffee", "work")
        h2 = hash_cache_key("good coffee", "work")
        assert h1 == h2

    def test_different_for_different_mode(self):
        h1 = hash_cache_key("good coffee", "work")
        h2 = hash_cache_key("good coffee", "rest")
        assert h1 != h2

    def test_different_for_different_text(self):
        h1 = hash_cache_key("good coffee", None)
        h2 = hash_cache_key("nice coffee", None)
        assert h1 != h2

    def test_none_mode_is_consistent(self):
        h1 = hash_cache_key("test", None)
        h2 = hash_cache_key("test", None)
        assert h1 == h2

    def test_returns_hex_string(self):
        h = hash_cache_key("test", None)
        assert isinstance(h, str)
        assert len(h) == 64  # SHA-256 hex digest
