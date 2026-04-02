from typing import Any


class NullAnalyticsAdapter:
    """No-op analytics provider for environments where analytics is not configured."""

    def track(
        self,
        event: str,
        properties: dict[str, str | int | bool | list[str] | None] | None = None,
        *,
        distinct_id: str | None = None,
    ) -> None:
        pass

    def identify(
        self, user_id: str, traits: dict[str, str | int | bool | None] | None = None
    ) -> None:
        pass

    def page(
        self,
        name: str | None = None,
        properties: dict[str, str | int | bool | None] | None = None,
    ) -> None:
        pass

    def query_hogql(self, hogql: str) -> list[dict[str, Any]]:
        return []
