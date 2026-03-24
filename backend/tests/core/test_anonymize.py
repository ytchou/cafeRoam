from core.anonymize import anonymize_user_id


class TestAnonymizeUserId:
    def test_returns_hex_string(self):
        """Anonymized ID is a hex-encoded SHA-256 hash."""
        result = anonymize_user_id("user-a1b2c3", salt="test-salt")
        assert isinstance(result, str)
        assert len(result) == 64  # SHA-256 hex digest

    def test_same_input_same_output(self):
        """Same user ID and salt always produces the same hash (deterministic)."""
        a = anonymize_user_id("user-a1b2c3", salt="test-salt")
        b = anonymize_user_id("user-a1b2c3", salt="test-salt")
        assert a == b

    def test_different_user_ids_produce_different_hashes(self):
        """Different user IDs produce different hashes."""
        a = anonymize_user_id("user-a1b2c3", salt="test-salt")
        b = anonymize_user_id("user-x9y8z7", salt="test-salt")
        assert a != b

    def test_different_salts_produce_different_hashes(self):
        """Different salts produce different hashes — salt is load-bearing."""
        a = anonymize_user_id("user-a1b2c3", salt="salt-one")
        b = anonymize_user_id("user-a1b2c3", salt="salt-two")
        assert a != b

    def test_not_equal_to_raw_user_id(self):
        """Output must not be the raw user ID (i.e., it's actually hashed)."""
        result = anonymize_user_id("user-a1b2c3", salt="test-salt")
        assert result != "user-a1b2c3"
