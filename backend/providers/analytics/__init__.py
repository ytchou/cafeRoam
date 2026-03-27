from core.config import settings
from providers.analytics.interface import AnalyticsProvider


def get_analytics_provider() -> AnalyticsProvider:
    match settings.analytics_provider:
        case "posthog":
            from providers.analytics.posthog_adapter import PostHogAnalyticsAdapter

            return PostHogAnalyticsAdapter(
                api_key=settings.posthog_api_key,
                host=settings.posthog_host,
                project_id=settings.posthog_project_id or "",
            )
        case _:
            from providers.analytics.null_adapter import NullAnalyticsAdapter

            return NullAnalyticsAdapter()
