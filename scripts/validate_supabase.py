#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = ["psycopg2-binary"]
# ///
"""Supabase cloud migration parity validator.

Usage:
    DATABASE_URL=postgresql://... uv run scripts/validate_supabase.py
    # Or with direct arg:
    uv run scripts/validate_supabase.py --database-url postgresql://...
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

import psycopg2


# -- Result model -------------------------------------------------------------

@dataclass
class CheckResult:
    category: str
    name: str
    passed: bool
    details: str


# -- Expected schema -----------------------------------------------------------

EXPECTED_MIN_MIGRATIONS = 78

EXPECTED_TABLES = {
    "shops", "shop_photos", "shop_reviews", "taxonomy_tags", "shop_tags",
    "profiles", "lists", "list_items", "check_ins", "stamps", "job_queue",
    "search_events", "shop_followers", "shop_claims", "shop_submissions",
    "activity_feed", "shop_menu_items", "community_note_likes",
    "user_roles", "search_cache", "shop_content", "shop_owner_tags",
    "review_responses", "admin_audit_logs",
}

RLS_REQUIRED_TABLES = {
    "check_ins", "lists", "list_items", "profiles", "shop_followers",
    "shop_claims", "shops", "shop_photos", "shop_reviews", "stamps",
    "job_queue", "user_roles", "search_events", "shop_menu_items",
    "community_note_likes", "activity_feed", "shop_submissions",
    "shop_content", "shop_owner_tags", "review_responses",
    "admin_audit_logs",
}

EXPECTED_TRIGGERS = {
    "trg_checkin_after_insert": "check_ins",
    "trg_enforce_max_lists": "lists",
}

EXPECTED_BUCKETS = {"checkin-photos", "menu-photos", "avatars", "claim-proofs"}


# -- Check functions -----------------------------------------------------------

def check_schema_parity(cursor) -> list[CheckResult]:
    """Verify migration count and expected tables exist."""
    results = []

    # 1. Migration count
    cursor.execute(
        "SELECT COUNT(*) FROM supabase_migrations.schema_migrations"
    )
    count = cursor.fetchone()[0]
    results.append(CheckResult(
        category="Schema",
        name="Migration count",
        passed=count >= EXPECTED_MIN_MIGRATIONS,
        details=f"{count} migrations applied (expected >= {EXPECTED_MIN_MIGRATIONS})",
    ))

    # 2. Expected tables exist
    cursor.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    )
    existing = {row[0] for row in cursor.fetchall()}
    missing = EXPECTED_TABLES - existing
    results.append(CheckResult(
        category="Schema",
        name="Expected tables",
        passed=len(missing) == 0,
        details=f"Missing: {sorted(missing)}" if missing else f"All {len(EXPECTED_TABLES)} expected tables present",
    ))

    return results


# -- Main entry point ----------------------------------------------------------

def run_all_checks(cursor) -> list[CheckResult]:
    """Run all validation checks and return results."""
    results = []
    results.extend(check_schema_parity(cursor))
    return results


def print_report(results: list[CheckResult]) -> bool:
    """Print structured report. Returns True if all passed."""
    current_category = None
    all_passed = True

    print("\n" + "=" * 60)
    print("  Supabase Migration Parity Report")
    print("=" * 60)

    for r in results:
        if r.category != current_category:
            current_category = r.category
            print(f"\n  [{current_category}]")

        status = "PASS" if r.passed else "FAIL"
        marker = "+" if r.passed else "!"
        print(f"    {marker} {status}: {r.name}")
        print(f"           {r.details}")
        if not r.passed:
            all_passed = False

    print("\n" + "-" * 60)
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed
    print(f"  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")
    print("=" * 60 + "\n")

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Validate Supabase migration parity")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Direct Postgres connection URL (not pooled). Default: $DATABASE_URL",
    )
    args = parser.parse_args()

    if not args.database_url:
        print("Error: DATABASE_URL not set. Provide via --database-url or env var.")
        print("Use the DIRECT connection string (port 5432), not the pooled one (port 6543).")
        sys.exit(1)

    try:
        conn = psycopg2.connect(args.database_url)
    except psycopg2.OperationalError as e:
        print(f"Connection failed: {e}")
        print("Ensure you're using the direct Postgres URL (port 5432), not pgBouncer (port 6543).")
        sys.exit(1)

    try:
        with conn.cursor() as cursor:
            results = run_all_checks(cursor)
    finally:
        conn.close()

    all_passed = print_report(results)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
