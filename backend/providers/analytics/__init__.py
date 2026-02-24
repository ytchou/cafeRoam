from core.config import settings
from providers.analytics.interface import AnalyticsProvider


def get_analytics_provider() -> AnalyticsProvider:
    match settings.analytics_provider:
        case "posthog":
            from providers.analytics.posthog_adapter import PostHogAnalyticsAdapter

            return PostHogAnalyticsAdapter(
                api_key=settings.posthog_api_key,
                host=settings.posthog_host,
            )
        case _:
            raise ValueError(
                f"Unknown analytics provider: {settings.analytics_provider}"
            )
