from core.tarot_vocabulary import TAROT_TITLES, TITLE_TO_TAGS


class TestTarotVocabulary:
    """The tarot vocabulary maps tag combinations to archetype titles."""

    def test_vocabulary_has_at_least_20_titles(self):
        assert len(TAROT_TITLES) >= 20

    def test_all_titles_are_unique(self):
        assert len(TAROT_TITLES) == len(set(TAROT_TITLES))

    def test_title_to_tags_maps_every_title(self):
        for title in TAROT_TITLES:
            assert title in TITLE_TO_TAGS, f"Missing tag mapping for {title}"

    def test_scholars_refuge_maps_to_quiet_laptop_wifi(self):
        tags = TITLE_TO_TAGS["The Scholar's Refuge"]
        assert "quiet" in tags
        assert "laptop_friendly" in tags
