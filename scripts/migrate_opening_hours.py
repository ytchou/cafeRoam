#!/usr/bin/env python3
"""One-time migration: convert opening_hours from string to structured format.

Usage:
    python scripts/migrate_opening_hours.py

Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from backend/.env (local)
or environment variables (staging/prod).
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env for local development
backend_env = Path(__file__).resolve().parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

# Add backend to sys.path so we can import core modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from supabase import create_client  # noqa: E402

from core.opening_hours import parse_to_structured  # noqa: E402

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
db = create_client(url, key)


def migrate() -> None:
    resp = db.table("shops").select("id, name, opening_hours").not_.is_("opening_hours", "null").execute()
    shops = resp.data or []
    migrated = 0
    skipped = 0
    failed: list[str] = []

    for shop in shops:
        hours = shop["opening_hours"]
        if not hours:
            skipped += 1
            continue

        # Already migrated? First element is a dict, not a string.
        if isinstance(hours[0], dict):
            skipped += 1
            continue

        structured = parse_to_structured(hours)
        if not structured:
            failed.append(f"  {shop['id']} — {shop['name']}")
            continue

        dumped = [s.model_dump() for s in structured]
        db.table("shops").update({"opening_hours": dumped}).eq("id", shop["id"]).execute()
        migrated += 1

    print(f"Migrated: {migrated}")
    print(f"Skipped (empty or already structured): {skipped}")
    if failed:
        print(f"Failed (all entries unparseable — {len(failed)} shops):")
        for line in failed:
            print(line)


if __name__ == "__main__":
    migrate()
