class PostHogAnalyticsAdapter:
    def __init__(self, api_key: str, host: str):
        self._api_key = api_key
        self._host = host

    def track(
        self, event: str, properties: dict[str, str | int | bool] | None = None
    ) -> None:
        pass  # TODO: implement with posthog-python

    def identify(
        self, user_id: str, traits: dict[str, str | int | bool] | None = None
    ) -> None:
        pass  # TODO: implement with posthog-python

    def page(
        self,
        name: str | None = None,
        properties: dict[str, str | int | bool] | None = None,
    ) -> None:
        pass  # TODO: implement with posthog-python
