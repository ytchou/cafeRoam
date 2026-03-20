import logging
from typing import Literal

import httpx

from models.types import DirectionsResult, GeocodingResult

logger = logging.getLogger(__name__)


class MapboxMapsAdapter:
    BASE_URL = "https://api.mapbox.com/search/geocode/v6"

    def __init__(self, access_token: str):
        self._token = access_token
        self._client = httpx.AsyncClient(timeout=10.0)

    async def geocode(self, address: str) -> GeocodingResult | None:
        try:
            response = await self._client.get(
                f"{self.BASE_URL}/forward",
                params={
                    "q": address,
                    "access_token": self._token,
                    "country": "TW",
                    "language": "zh",
                    "limit": 1,
                },
            )
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if not features:
                return None
            feature = features[0]
            coords = feature["geometry"]["coordinates"]
            return GeocodingResult(
                latitude=coords[1],
                longitude=coords[0],
                formatted_address=feature["properties"]["full_address"],
            )
        except (httpx.HTTPStatusError, httpx.RequestError, KeyError) as e:
            logger.warning("Mapbox geocode failed: %s", e)
            return None

    async def reverse_geocode(self, lat: float, lng: float) -> str | None:
        try:
            response = await self._client.get(
                f"{self.BASE_URL}/reverse",
                params={
                    "longitude": lng,
                    "latitude": lat,
                    "access_token": self._token,
                    "language": "zh",
                    "limit": 1,
                },
            )
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if not features:
                return None
            return str(features[0]["properties"]["full_address"])
        except (httpx.HTTPStatusError, httpx.RequestError, KeyError) as e:
            logger.warning("Mapbox reverse geocode failed: %s", e)
            return None

    DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox"

    async def get_directions(
        self,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        profile: Literal["walking", "driving-traffic"],
    ) -> DirectionsResult | None:
        try:
            coords = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
            response = await self._client.get(
                f"{self.DIRECTIONS_URL}/{profile}/{coords}",
                params={
                    "access_token": self._token,
                    "overview": "false",
                },
            )
            response.raise_for_status()
            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                return None
            route = routes[0]  # safe: empty case handled above
            return DirectionsResult(
                duration_min=max(1, round(route["duration"] / 60)),
                distance_m=round(route["distance"]),
                profile=profile,
            )
        except (httpx.HTTPStatusError, httpx.RequestError, KeyError) as e:
            logger.warning("Mapbox directions failed: %s", e)
            return None

    async def close(self) -> None:
        await self._client.aclose()
