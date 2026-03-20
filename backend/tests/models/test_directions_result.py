from models.types import DirectionsResult


class TestDirectionsResult:
    def test_frontend_receives_camel_case_field_names(self):
        result = DirectionsResult(duration_min=7, distance_m=580, profile="walking")
        data = result.model_dump(by_alias=True)
        assert data == {
            "durationMin": 7,
            "distanceM": 580,
            "profile": "walking",
        }

    def test_driving_traffic_is_a_valid_direction_profile(self):
        result = DirectionsResult(duration_min=3, distance_m=2100, profile="driving-traffic")
        assert result.profile == "driving-traffic"
