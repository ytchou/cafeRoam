import pytest

from core.lang import cjk_ratio, is_zh_dominant


class TestCjkRatio:
    def test_pure_chinese_text_scores_high(self):
        text = "這間咖啡廳很適合工作，環境安靜"
        assert cjk_ratio(text) > 0.8

    def test_english_only_scores_zero(self):
        text = "A cozy cafe perfect for remote work with great wifi"
        assert cjk_ratio(text) == 0.0

    def test_mixed_zh_en_with_shop_name_scores_moderate(self):
        text = "位於大安區的 Cafe Nomad 以手沖咖啡聞名，適合自由工作者"
        ratio = cjk_ratio(text)
        assert 0.3 < ratio < 0.8

    def test_empty_string_returns_zero(self):
        assert cjk_ratio("") == 0.0

    def test_whitespace_only_returns_zero(self):
        assert cjk_ratio("   \n\t  ") == 0.0

    def test_chinese_with_numbers_and_punctuation(self):
        text = "營業時間 10:00-22:00，低消 $150"
        ratio = cjk_ratio(text)
        assert ratio > 0.2

    def test_fullwidth_punctuation_counted_as_cjk(self):
        text = "好喝！推薦拿鐵。"
        ratio = cjk_ratio(text)
        assert ratio > 0.8


class TestIsZhDominant:
    def test_chinese_description_passes(self):
        text = "隱身在巷弄中的老屋咖啡廳，以手沖單品和自製甜點聞名。適合想要安靜工作或閱讀的人。"
        assert is_zh_dominant(text) is True

    def test_english_description_fails(self):
        text = "A hidden gem in the alley, known for pour-over coffee and homemade desserts. Perfect for remote work."
        assert is_zh_dominant(text) is False

    def test_mixed_with_enough_chinese_passes(self):
        text = "Cafe Nomad 是台北知名的工作咖啡廳，提供穩定的 WiFi 和充電插座"
        assert is_zh_dominant(text) is True

    def test_mostly_english_with_few_chinese_fails(self):
        text = "Great coffee shop with nice ambiance. 不錯"
        assert is_zh_dominant(text) is False

    def test_custom_threshold(self):
        text = "一間咖啡廳 with great coffee"
        assert is_zh_dominant(text, threshold=0.1) is True
        assert is_zh_dominant(text, threshold=0.8) is False

    def test_empty_string_fails(self):
        assert is_zh_dominant("") is False

    @pytest.mark.parametrize(
        "text",
        [
            "顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。",
            "這家咖啡廳的手沖咖啡很有水準，甜點也很推薦。週末人較多建議平日前往。",
            "位於松山區的小型咖啡廳，以耶加雪菲和藝伎豆聞名。不限時、有插座。",
        ],
        ids=["short-summary", "medium-summary", "with-coffee-origins"],
    )
    def test_realistic_enrichment_summaries_pass(self, text: str):
        assert is_zh_dominant(text) is True
