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


def make_tarot_shop_row(**overrides: object) -> dict:
    """Shop row with tarot enrichment fields, as returned by Supabase."""
    return {
        "id": "shop-tarot-01",
        "name": "森日咖啡",
        "slug": "sen-ri-ka-fei",
        "address": "台北市中山區南京東路二段178號",
        "city": "台北市",
        "latitude": 25.0522,
        "longitude": 121.5343,
        "mrt": "松江南京",
        "rating": 4.5,
        "review_count": 142,
        "opening_hours": [
            "Monday: 8:00 AM - 9:00 PM",
            "Tuesday: 8:00 AM - 9:00 PM",
            "Wednesday: 8:00 AM - 9:00 PM",
            "Thursday: 8:00 AM - 9:00 PM",
            "Friday: 8:00 AM - 10:00 PM",
            "Saturday: 9:00 AM - 10:00 PM",
            "Sunday: 9:00 AM - 6:00 PM",
        ],
        "tarot_title": "The Scholar's Refuge",
        "flavor_text": "For those who seek quiet in an unquiet world.",
        "processing_status": "live",
        "shop_photos": [
            {
                "url": "https://example.supabase.co/storage/v1/object/public/shop-photos/tarot-01/exterior.jpg"
            }
        ],
        **overrides,
    }


def make_vibe_row(**overrides: object) -> dict:
    """A vibe_collections row."""
    defaults = {
        "id": "vibe-study-cave",
        "slug": "study-cave",
        "name": "Study Cave",
        "name_zh": "讀書洞穴",
        "emoji": "📚",
        "subtitle": "Quiet · WiFi",
        "subtitle_zh": "安靜 · 有網路",
        "tag_ids": ["quiet", "laptop_friendly", "wifi_available", "no_time_limit"],
        "sort_order": 1,
        "is_active": True,
    }
    return {**defaults, **overrides}


def make_shop_tag_row(shop_id: str = "shop-d4e5f6", tag_id: str = "quiet") -> dict:
    """A shop_tags join row."""
    return {"shop_id": shop_id, "tag_id": tag_id}


def make_user_role(**overrides: object) -> dict:
    defaults = {
        "id": "role-r1s2t3",
        "user_id": "user-a1b2c3",
        "role": "blogger",
        "granted_at": _TS,
        "granted_by": "admin-x9y8z7",
    }
    return {**defaults, **overrides}


def make_community_note_row(**overrides: object) -> dict:
    """A joined row combining check_in + profile + shop + like count,
    as returned by the CommunityService query."""
    defaults = {
        "checkin_id": "ci-j0k1l2",
        "review_text": "Hinoki Coffee has the most incredible natural light in the afternoons. Brought my Kindle and ended up reading for three hours.",
        "stars": 5,
        "photo_urls": [
            "https://example.supabase.co/storage/v1/object/public/checkin-photos/user-a1b2c3/photo1.jpg"
        ],
        "created_at": "2026-03-15T14:30:00",
        "user_id": "user-a1b2c3",
        "display_name": "Mei-Ling ☕",
        "avatar_url": None,
        "role": "blogger",
        "shop_name": "Hinoki Coffee",
        "shop_slug": "hinoki-coffee",
        "shop_district": "大安",
        "like_count": 12,
    }
    return {**defaults, **overrides}
