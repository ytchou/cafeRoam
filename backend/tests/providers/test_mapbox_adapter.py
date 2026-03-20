from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from models.types import DirectionsResult
from providers.maps.mapbox_adapter import MapboxMapsAdapter

GEOCODE_RESPONSE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [121.5654, 25.0330]},
            "properties": {"full_address": "台北市大安區忠孝東路四段"},
        }
    ],
}

EMPTY_RESPONSE = {"type": "FeatureCollection", "features": []}


class TestMapboxGeocode:
    @pytest.fixture
    def adapter(self):
        return MapboxMapsAdapter(access_token="test-token")

    async def test_returns_geocoding_result(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = GEOCODE_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.geocode("台北市大安區忠孝東路四段")

        assert result is not None
        assert result.latitude == pytest.approx(25.0330)
        assert result.longitude == pytest.approx(121.5654)
        assert result.formatted_address == "台北市大安區忠孝東路四段"

    async def test_returns_none_on_empty_results(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = EMPTY_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.geocode("nonexistent address")
        assert result is None

    async def test_returns_none_on_http_error(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "Server error", request=MagicMock(), response=MagicMock(status_code=500)
            )
        )

        result = await adapter.geocode("台北市")
        assert result is None

    async def test_returns_none_on_timeout(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

        result = await adapter.geocode("台北市")
        assert result is None

    async def test_returns_none_on_connect_error(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(side_effect=httpx.ConnectError("DNS failure"))

        result = await adapter.geocode("台北市")
        assert result is None

    async def test_returns_none_on_malformed_response(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "type": "FeatureCollection",
            "features": [{"type": "Feature"}],  # missing geometry
        }
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.geocode("台北市")
        assert result is None

    async def test_passes_correct_params(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = EMPTY_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        await adapter.geocode("台北市信義區")

        call_args = adapter._client.get.call_args
        url = call_args[0][0] if call_args[0] else call_args.kwargs.get("url", "")
        params = call_args.kwargs.get("params", {})

        assert "forward" in url
        assert params["q"] == "台北市信義區"
        assert params["country"] == "TW"
        assert params["language"] == "zh"
        assert params["access_token"] == "test-token"


class TestMapboxReverseGeocode:
    @pytest.fixture
    def adapter(self):
        return MapboxMapsAdapter(access_token="test-token")

    async def test_returns_address_string(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = GEOCODE_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.reverse_geocode(25.0330, 121.5654)
        assert result == "台北市大安區忠孝東路四段"

    async def test_returns_none_on_empty_results(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = EMPTY_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.reverse_geocode(0.0, 0.0)
        assert result is None

    async def test_returns_none_on_error(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

        result = await adapter.reverse_geocode(25.0330, 121.5654)
        assert result is None


DIRECTIONS_RESPONSE = {
    "routes": [{"duration": 420, "distance": 580}],
    "code": "Ok",
}

DIRECTIONS_EMPTY = {"routes": [], "code": "Ok"}


class TestMapboxGetDirections:
    @pytest.fixture
    def adapter(self):
        return MapboxMapsAdapter(access_token="test-token")

    async def test_returns_directions_result_for_walking(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = DIRECTIONS_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "walking")

        assert result is not None
        assert isinstance(result, DirectionsResult)
        assert result.duration_min == 7  # 420s → 7min
        assert result.distance_m == 580
        assert result.profile == "walking"

    async def test_returns_directions_result_for_driving(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"routes": [{"duration": 180, "distance": 2100}], "code": "Ok"}
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "driving-traffic")

        assert result is not None
        assert result.duration_min == 3
        assert result.profile == "driving-traffic"

    async def test_returns_none_on_empty_routes(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = DIRECTIONS_EMPTY
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        result = await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "walking")
        assert result is None

    async def test_returns_none_on_http_error(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "Server error", request=MagicMock(), response=MagicMock(status_code=500)
            )
        )

        result = await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "walking")
        assert result is None

    async def test_returns_none_on_timeout(self, adapter):
        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

        result = await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "walking")
        assert result is None

    async def test_passes_correct_url_and_params(self, adapter):
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = DIRECTIONS_RESPONSE
        mock_response.raise_for_status = MagicMock()

        adapter._client = AsyncMock(spec=httpx.AsyncClient)
        adapter._client.get = AsyncMock(return_value=mock_response)

        await adapter.get_directions(25.04, 121.55, 25.033, 121.565, "walking")

        call_args = adapter._client.get.call_args
        url = call_args[0][0] if call_args[0] else call_args.kwargs.get("url", "")
        params = call_args.kwargs.get("params", {})

        assert "directions/v5/mapbox/walking" in url
        assert "121.55,25.04;121.565,25.033" in url
        assert params["access_token"] == "test-token"
        assert params["overview"] == "false"
