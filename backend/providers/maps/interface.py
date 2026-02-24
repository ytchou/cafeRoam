from typing import Protocol

from models.types import GeocodingResult


class MapsProvider(Protocol):
    async def geocode(self, address: str) -> GeocodingResult | None: ...

    async def reverse_geocode(self, lat: float, lng: float) -> str | None: ...
