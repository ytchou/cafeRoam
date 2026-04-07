"""Seed shops from a cleaned CSV into the Supabase shops table.

Usage:
    uv run python scripts/seed_shops_csv.py <cleaned.csv>

Input CSV must have: name, google_maps_url columns.
Idempotent: rows whose google_maps_url already exist in DB are skipped.
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import Any, cast

sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import get_service_role_client


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed shops from cleaned CSV into DB.")
    parser.add_argument("input", help="Path to cleaned CSV file")
    args = parser.parse_args()

    input_path = Path(args.input)

    rows: list[dict[str, str]] = []
    with input_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("name") or "").strip()
            url = (row.get("google_maps_url") or "").strip()
            if name and url:
                rows.append({"name": name, "google_maps_url": url})

    total = len(rows)
    if total == 0:
        print("No rows to process.")
        return

    db = get_service_role_client()

    # Batch duplicate check — one query for all candidate URLs
    candidate_urls = [r["google_maps_url"] for r in rows]
    existing_response = (
        db.table("shops").select("google_maps_url").in_("google_maps_url", candidate_urls).execute()
    )
    existing_urls = {
        row["google_maps_url"] for row in cast("list[dict[str, Any]]", existing_response.data or [])
    }

    rows_to_insert: list[dict[str, Any]] = []
    skipped = 0
    for row in rows:
        if row["google_maps_url"] in existing_urls:
            skipped += 1
        else:
            rows_to_insert.append(
                {
                    "name": row["name"],
                    "google_maps_url": row["google_maps_url"],
                    "address": "",
                    "review_count": 0,
                    "processing_status": "pending",
                    "source": "manual",
                }
            )

    inserted = 0
    if rows_to_insert:
        db.table("shops").insert(rows_to_insert).execute()
        inserted = len(rows_to_insert)

    print(f"total: {total}")
    print(f"inserted: {inserted}")
    print(f"skipped: {skipped}")


if __name__ == "__main__":
    main()
