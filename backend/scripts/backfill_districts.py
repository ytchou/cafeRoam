"""Backfill district_id on shops by parsing district name from address.

Usage: cd backend && python -m scripts.backfill_districts [--dry-run]
"""

import re
import sys
from typing import Any, cast

from db.supabase_client import get_service_role_client

_DISTRICT_RE = re.compile(r"([\u4e00-\u9fff]{2}區)")


def main(dry_run: bool = False) -> None:
    db = get_service_role_client()

    # 1. Load all districts
    district_resp = db.table("districts").select("id, name_zh").execute()
    districts = cast("list[dict[str, Any]]", district_resp.data or [])
    zh_to_id: dict[str, str] = {d["name_zh"]: d["id"] for d in districts}
    print(f"Loaded {len(zh_to_id)} districts")

    # 2. Load all shops without a district
    shop_resp = (
        db.table("shops")
        .select("id, name, address, district_id")
        .is_("district_id", "null")
        .eq("processing_status", "live")
        .limit(5000)
        .execute()
    )
    shops = cast("list[dict[str, Any]]", shop_resp.data or [])
    print(f"Found {len(shops)} shops without district_id")

    matched = 0
    unmatched: list[str] = []

    for shop in shops:
        address = shop.get("address") or ""
        m = _DISTRICT_RE.search(address)
        if not m:
            unmatched.append(f"  {shop['name']} — no district in address: {address[:40]}")
            continue

        district_name = m.group(1)
        district_id = zh_to_id.get(district_name)
        if not district_id:
            unmatched.append(f"  {shop['name']} — unknown district: {district_name}")
            continue

        if not dry_run:
            db.table("shops").update({"district_id": district_id}).eq("id", shop["id"]).execute()
        matched += 1
        print(f"  {shop['name']} -> {district_name}")

    # 3. Update shop_count on districts
    if not dry_run:
        for name_zh, district_id in zh_to_id.items():
            count_resp = (
                db.table("shops")
                .select("id", count="exact")
                .eq("district_id", district_id)
                .eq("processing_status", "live")
                .execute()
            )
            count = count_resp.count or 0
            db.table("districts").update({"shop_count": count}).eq("id", district_id).execute()
            print(f"  {name_zh}: {count} shops")

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
