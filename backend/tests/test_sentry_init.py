from unittest.mock import patch


class TestSentryInit:
    """Test that Sentry initializes correctly when DSN is provided."""

    def test_sentry_init_called_with_dsn(self):
        """Sentry SDK should be initialized when SENTRY_DSN is set."""
        with (
            patch("main.sentry_sdk") as mock_sentry,
            patch("main.settings") as mock_settings,
        ):
            mock_settings.sentry_dsn = "https://test@sentry.io/123"
            mock_settings.environment = "production"

            from main import _init_sentry

            _init_sentry()

            mock_sentry.init.assert_called_once()
            call_kwargs = mock_sentry.init.call_args.kwargs
            assert call_kwargs["dsn"] == "https://test@sentry.io/123"
            assert call_kwargs["environment"] == "production"
            assert call_kwargs["traces_sample_rate"] == 0.1

    def test_sentry_skipped_without_dsn(self):
        """Sentry should not initialize when DSN is empty."""
        with (
            patch("main.sentry_sdk") as mock_sentry,
            patch("main.settings") as mock_settings,
        ):
            mock_settings.sentry_dsn = ""

            from main import _init_sentry

            _init_sentry()

            mock_sentry.init.assert_not_called()
