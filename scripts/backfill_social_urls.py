#!/usr/bin/env python3
"""
Backfill social URLs from the website field for shops where Apify returned nothing.

Run with:
    cd backend && uv run python ../scripts/backfill_social_urls.py          # dry-run (default)
    cd backend && uv run python ../scripts/backfill_social_urls.py --apply  # write changes

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env
"""
import argparse
import os
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

from supabase import create_client
from utils.url_classifier import classify_social_url

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill social URLs from website field")
    parser.add_argument(
        "--apply",
        action="store_true",
        default=False,
        help="Write changes to the database (default: dry-run, prints only)",
    )
    args = parser.parse_args()
    dry_run = not args.apply

    if dry_run:
        print("DRY-RUN mode — no writes will be made. Pass --apply to write.")
    else:
        print("APPLY mode — changes will be written to the database.")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Fetch all shops that have a website but are missing at least one social URL
    response = (
        client.table("shops")
        .select("id, website, instagram_url, facebook_url, threads_url")
        .not_.is_("website", "null")
        .execute()
    )
    shops = response.data
    print(f"Fetched {len(shops)} shops with a website field")

    updates: list[dict] = []
    for shop in shops:
        classified = classify_social_url(shop["website"])
        patch: dict = {}

        if shop["instagram_url"] is None and classified["instagram_url"]:
            patch["instagram_url"] = classified["instagram_url"]
        if shop["facebook_url"] is None and classified["facebook_url"]:
            patch["facebook_url"] = classified["facebook_url"]
        if shop["threads_url"] is None and classified["threads_url"]:
            patch["threads_url"] = classified["threads_url"]

        if patch:
            patch["id"] = shop["id"]
            updates.append(patch)

    print(f"Shops to update: {len(updates)}")

    if dry_run:
        for update in updates:
            print(f"  [dry-run] would update shop {update['id']}: {update}")
        print("Dry-run complete. No changes written.")
        return

    for i, update in enumerate(updates):
        shop_id = update.pop("id")
        client.table("shops").update(update).eq("id", shop_id).execute()
        if i % 50 == 0:
            print(f"  Updated {i}/{len(updates)}...")

    print("Backfill complete.")


if __name__ == "__main__":
    main()
