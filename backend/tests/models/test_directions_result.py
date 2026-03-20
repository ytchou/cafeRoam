from models.types import DirectionsResult


class TestDirectionsResult:
    def test_serializes_to_camel_case(self):
        result = DirectionsResult(duration_min=7, distance_m=580, profile="walking")
        data = result.model_dump(by_alias=True)
        assert data == {
            "durationMin": 7,
            "distanceM": 580,
            "profile": "walking",
        }

    def test_accepts_driving_traffic_profile(self):
        result = DirectionsResult(
            duration_min=3, distance_m=2100, profile="driving-traffic"
        )
        assert result.profile == "driving-traffic"
