"""One-time backfill: assign district_id on existing shops by parsing city + district from address.

New shops are assigned automatically via DistrictService.assign_district() in the processing
pipeline. Run this script once to backfill shops that were ingested before that was in place.

Usage: cd backend && python -m scripts.backfill_districts [--dry-run]
"""

import sys

from db.supabase_client import get_service_role_client
from services.district_service import DistrictService, _parse_city_district


def main(dry_run: bool = False) -> None:
    db = get_service_role_client()
    service = DistrictService(db)

    # Load all districts to build (city, name_zh) -> id lookup
    district_resp = db.table("districts").select("id, name_zh, city").execute()
    districts = district_resp.data or []
    key_to_id = {(d["city"], d["name_zh"]): d["id"] for d in districts}
    print(f"Loaded {len(key_to_id)} districts")

    # Load all live shops without a district_id
    shop_resp = (
        db.table("shops")
        .select("id, name, address")
        .is_("district_id", "null")
        .eq("processing_status", "live")
        .limit(5000)
        .execute()
    )
    shops = shop_resp.data or []
    print(f"Found {len(shops)} shops without district_id")

    matched = 0
    unmatched: list[str] = []

    for shop in shops:
        address = shop.get("address") or ""
        parsed = _parse_city_district(address)
        if not parsed:
            unmatched.append(f"  {shop['name']} — could not parse address: {address[:50]}")
            continue

        city_en, district_zh = parsed
        if (city_en, district_zh) not in key_to_id:
            unmatched.append(
                f"  {shop['name']} — no district row for ({city_en}, {district_zh})"
            )
            continue

        if not dry_run:
            service.assign_district(shop["id"], address)
        matched += 1
        print(f"  {shop['name']} -> {city_en} / {district_zh}")

    print(f"\nMatched: {matched}, Unmatched: {len(unmatched)}")
    if unmatched:
        print("Unmatched shops (need manual assignment):")
        for line in unmatched:
            print(line)


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    if dry:
        print("=== DRY RUN ===")
    main(dry_run=dry)
