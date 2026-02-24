from models.types import GeocodingResult


class MapboxMapsAdapter:
    def __init__(self, access_token: str):
        self._token = access_token

    async def geocode(self, address: str) -> GeocodingResult | None:
        raise NotImplementedError("Geocoding not yet implemented")

    async def reverse_geocode(self, lat: float, lng: float) -> str | None:
        raise NotImplementedError("Reverse geocoding not yet implemented")
