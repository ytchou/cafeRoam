"""Shared test data factories. Realistic Taiwan-based defaults, all overridable."""

_TS = "2026-01-15T10:00:00"


def make_user(**overrides: object) -> dict:
    defaults = {
        "id": "user-a1b2c3",
        "email": "lin.mei@gmail.com",
        "display_name": "林美",
        "avatar_url": None,
        "pdpa_consent_at": _TS,
        "deletion_requested_at": None,
        "created_at": _TS,
    }
    return {**defaults, **overrides}


def make_shop(**overrides: object) -> dict:
    """Clean shop dict matching the Shop model fields (no RPC-only extras)."""
    defaults = {
        "id": "shop-d4e5f6",
        "name": "山小孩咖啡",
        "address": "台北市大安區溫州街74巷5弄2號",
        "latitude": 25.0216,
        "longitude": 121.5312,
        "mrt": "台電大樓",
        "phone": "02-2364-0088",
        "website": "https://www.instagram.com/mountainkidcoffee",
        "opening_hours": None,
        "rating": 4.6,
        "review_count": 287,
        "price_range": "$$",
        "description": "安靜適合工作的獨立咖啡店",
        "photo_urls": [
            "https://example.supabase.co/storage/v1/object/public/shop-photos/d4e5f6/exterior.jpg"
        ],
        "menu_url": None,
        "taxonomy_tags": [],
        "mode_scores": None,
        "cafenomad_id": "shop-cn-001",
        "google_place_id": "ChIJ-4E5F6-pQjQR_example",
        "created_at": _TS,
        "updated_at": _TS,
    }
    return {**defaults, **overrides}


def make_shop_row(**overrides: object) -> dict:
    """Shop row as returned by Supabase RPC — extends make_shop() with similarity and tag_ids."""
    return {
        **make_shop(),
        "similarity": 0.85,
        "tag_ids": ["quiet", "wifi-reliable"],
        **overrides,
    }


def make_list(**overrides: object) -> dict:
    defaults = {
        "id": "list-g7h8i9",
        "user_id": "user-a1b2c3",
        "name": "適合工作的咖啡店",
        "created_at": _TS,
        "updated_at": _TS,
    }
    return {**defaults, **overrides}


def make_list_item(**overrides: object) -> dict:
    defaults = {
        "list_id": "list-g7h8i9",
        "shop_id": "shop-d4e5f6",
        "added_at": _TS,
    }
    return {**defaults, **overrides}


def make_checkin(**overrides: object) -> dict:
    defaults = {
        "id": "ci-j0k1l2",
        "user_id": "user-a1b2c3",
        "shop_id": "shop-d4e5f6",
        "photo_urls": [
            "https://example.supabase.co/storage/v1/object/public/checkin-photos/user-a1b2c3/photo1.jpg"
        ],
        "menu_photo_url": None,
        "note": None,
        "created_at": _TS,
    }
    return {**defaults, **overrides}


def make_stamp(**overrides: object) -> dict:
    defaults = {
        "id": "stamp-m3n4o5",
        "user_id": "user-a1b2c3",
        "shop_id": "shop-d4e5f6",
        "check_in_id": "ci-j0k1l2",
        "design_url": "https://example.supabase.co/storage/v1/object/public/stamps/d4e5f6.png",
        "earned_at": _TS,
    }
    return {**defaults, **overrides}
