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

EXPECTED_MIN_MIGRATIONS = 76

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

# Tables that use RLS with no user policies (service-role only)
SERVICE_ROLE_ONLY_TABLES = {"admin_audit_logs", "job_queue", "search_events"}

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


def check_rls(cursor) -> list[CheckResult]:
    """Verify RLS is enabled and policies exist on required tables."""
    results = []

    # 1. Which tables have RLS enabled?
    cursor.execute(
        "SELECT c.relname FROM pg_class c "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true"
    )
    rls_enabled = {row[0] for row in cursor.fetchall()}
    missing_rls = RLS_REQUIRED_TABLES - rls_enabled
    results.append(CheckResult(
        category="RLS",
        name="RLS enabled on required tables",
        passed=len(missing_rls) == 0,
        details=f"Missing RLS: {sorted(missing_rls)}" if missing_rls
            else f"All {len(RLS_REQUIRED_TABLES)} required tables have RLS enabled",
    ))

    # 2. Do user-facing tables have policies?
    # (service-role-only tables intentionally have RLS with no permissive policies)
    cursor.execute(
        "SELECT tablename, COUNT(*) FROM pg_policies "
        "WHERE schemaname = 'public' GROUP BY tablename"
    )
    policy_counts = {row[0]: row[1] for row in cursor.fetchall()}
    user_facing = RLS_REQUIRED_TABLES - SERVICE_ROLE_ONLY_TABLES
    no_policies = [t for t in user_facing if policy_counts.get(t, 0) == 0]
    results.append(CheckResult(
        category="RLS",
        name="Policies exist on user-facing tables",
        passed=len(no_policies) == 0,
        details=f"No policies: {sorted(no_policies)}" if no_policies
            else f"All {len(user_facing)} user-facing tables have at least one policy",
    ))

    return results


def check_triggers(cursor) -> list[CheckResult]:
    """Verify expected triggers exist and are enabled."""
    results = []

    cursor.execute(
        "SELECT t.tgname, c.relname, t.tgenabled "
        "FROM pg_trigger t "
        "JOIN pg_class c ON c.oid = t.tgrelid "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname = 'public' AND NOT t.tgisinternal"
    )
    triggers = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

    for trigger_name, expected_table in EXPECTED_TRIGGERS.items():
        if trigger_name not in triggers:
            results.append(CheckResult(
                category="Triggers",
                name=f"{trigger_name}",
                passed=False,
                details=f"Trigger not found (expected on {expected_table})",
            ))
        else:
            table, enabled = triggers[trigger_name]
            is_enabled = enabled in ("O", "A")
            on_correct_table = table == expected_table
            passed = is_enabled and on_correct_table
            details_parts = []
            if not on_correct_table:
                details_parts.append(f"on {table} (expected {expected_table})")
            if not is_enabled:
                details_parts.append(f"disabled (tgenabled={enabled})")
            if passed:
                details_parts.append(f"enabled on {table}")
            results.append(CheckResult(
                category="Triggers",
                name=f"{trigger_name}",
                passed=passed,
                details="; ".join(details_parts),
            ))

    return results


def check_pgvector(cursor) -> list[CheckResult]:
    """Verify pgvector extension, HNSW index, and query capability."""
    results = []

    # 1. Extension enabled
    cursor.execute(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    )
    rows = cursor.fetchall()
    has_extension = len(rows) > 0
    results.append(CheckResult(
        category="pgvector",
        name="vector extension",
        passed=has_extension,
        details="Enabled" if has_extension else "Not found — run CREATE EXTENSION vector",
    ))

    # 2. HNSW index on shops.embedding
    cursor.execute(
        "SELECT indexname FROM pg_indexes "
        "WHERE tablename = 'shops' AND indexdef LIKE '%hnsw%'"
    )
    indexes = cursor.fetchall()
    has_hnsw = len(indexes) > 0
    results.append(CheckResult(
        category="pgvector",
        name="HNSW index on shops.embedding",
        passed=has_hnsw,
        details=f"Found: {indexes[0][0]}" if has_hnsw else "No HNSW index found on shops table",
    ))

    # 3. Test cosine similarity query
    if has_extension:
        try:
            cursor.execute(
                "SELECT 1 - (embedding <=> ('[' || repeat('0,', 1535) || '0]')::vector) "
                "AS similarity FROM shops WHERE embedding IS NOT NULL LIMIT 1"
            )
            row = cursor.fetchone()
            query_works = row is not None
            details = f"Query returned similarity={row[0]:.4f}" if query_works else "No rows with embeddings found"
        except Exception as e:
            query_works = False
            details = f"Query failed: {e}"
    else:
        query_works = False
        details = "Skipped — vector extension not available"

    results.append(CheckResult(
        category="pgvector",
        name="Cosine similarity query",
        passed=query_works,
        details=details,
    ))

    return results


def check_pgbouncer_compat(cursor) -> list[CheckResult]:
    """Check for SET LOCAL usage in user-defined functions.

    SET LOCAL inside PL/pgSQL function bodies is pgBouncer-safe (scoped to
    the calling transaction). SET LOCAL as standalone SQL statements is NOT
    safe under pgBouncer transaction mode.
    """
    results = []

    cursor.execute(
        "SELECT p.proname, pg_get_functiondef(p.oid) "
        "FROM pg_proc p "
        "JOIN pg_namespace n ON n.oid = p.pronamespace "
        "WHERE n.nspname = 'public' "
        "AND p.prokind = 'f' "
        "AND pg_get_functiondef(p.oid) ILIKE '%SET LOCAL%'"
    )
    functions = cursor.fetchall()

    if not functions:
        results.append(CheckResult(
            category="pgBouncer",
            name="SET LOCAL usage",
            passed=True,
            details="No functions use SET LOCAL — no pgBouncer risk",
        ))
    else:
        func_names = [f[0] for f in functions]
        results.append(CheckResult(
            category="pgBouncer",
            name="SET LOCAL in function bodies",
            passed=True,
            details=(
                f"Found SET LOCAL in: {', '.join(func_names)}. "
                f"All inside PL/pgSQL function bodies — pgBouncer-safe."
            ),
        ))

    return results


def check_storage_buckets(cursor) -> list[CheckResult]:
    """Verify expected storage buckets exist."""
    results = []

    cursor.execute("SELECT id FROM storage.buckets")
    existing = {row[0] for row in cursor.fetchall()}
    missing = EXPECTED_BUCKETS - existing
    results.append(CheckResult(
        category="Storage",
        name="Expected buckets",
        passed=len(missing) == 0,
        details=f"Missing: {sorted(missing)}" if missing
            else f"All {len(EXPECTED_BUCKETS)} buckets present: {sorted(existing & EXPECTED_BUCKETS)}",
    ))

    return results


# -- Main entry point ----------------------------------------------------------

def run_all_checks(cursor) -> list[CheckResult]:
    """Run all validation checks and return results."""
    results = []
    results.extend(check_schema_parity(cursor))
    results.extend(check_rls(cursor))
    results.extend(check_triggers(cursor))
    results.extend(check_pgvector(cursor))
    results.extend(check_pgbouncer_compat(cursor))
    results.extend(check_storage_buckets(cursor))
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
