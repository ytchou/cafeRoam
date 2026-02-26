from importers.cafe_nomad import filter_cafenomad_shops


def test_filter_removes_closed_shops():
    shops = [
        {"id": "1", "name": "Open Cafe", "latitude": "25.033", "longitude": "121.565", "closed": None},
        {"id": "2", "name": "Closed Cafe", "latitude": "25.034", "longitude": "121.566", "closed": "1"},
    ]
    filtered = filter_cafenomad_shops(shops)
    assert len(filtered) == 1
    assert filtered[0]["name"] == "Open Cafe"


def test_filter_removes_out_of_bounds():
    shops = [
        {"id": "1", "name": "Taipei Cafe", "latitude": "25.033", "longitude": "121.565", "closed": None},
        {"id": "2", "name": "Foreign Cafe", "latitude": "40.730", "longitude": "-73.935", "closed": None},
    ]
    filtered = filter_cafenomad_shops(shops)
    assert len(filtered) == 1
