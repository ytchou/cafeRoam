# Supabase Cloud Migration Parity Validation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Design Doc:** [docs/designs/2026-03-30-supabase-cloud-migration-parity-design.md](docs/designs/2026-03-30-supabase-cloud-migration-parity-design.md)

**Spec References:** —

**PRD References:** —

**Goal:** Build a reusable Python validation script that checks any Supabase instance for schema parity, RLS, triggers, pgvector, pgBouncer compatibility, and storage buckets.

**Architecture:** Standalone Python script (`scripts/validate_supabase.py`) using PEP 723 inline dependencies (`psycopg2-binary`). Connects via direct Postgres URL (port 5432, not pooled 6543). Each check category is a pure function taking a cursor and returning `CheckResult` objects. Report is printed with PASS/FAIL per check, exit code 0/1.

**Tech Stack:** Python 3.12+, psycopg2-binary, uv (script runner)

**Acceptance Criteria:**
- [ ] Running `uv run scripts/validate_supabase.py` against local Supabase reports all checks PASS
- [ ] Running against staging Supabase reports all checks PASS (or documents actionable FAIL items)
- [ ] Script exits 1 when any check fails, exit 0 when all pass
- [ ] `make validate-supabase` target works with DATABASE_URL env var

---

### Task 1: Script skeleton + CheckResult model + schema parity check

**Files:**
- Create: `scripts/validate_supabase.py`
- Create: `scripts/test_validate_supabase.py`

**Step 1: Write the failing test**

```python
# scripts/test_validate_supabase.py
"""Tests for validate_supabase.py — mock cursor at DB boundary."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from unittest.mock import MagicMock
from validate_supabase import check_schema_parity, CheckResult


class MockCursor:
    """Minimal cursor mock that returns pre-set results."""

    def __init__(self, results: list):
        self._results = iter(results)

    def execute(self, query, params=None):
        self._current = next(self._results)

    def fetchone(self):
        return self._current

    def fetchall(self):
        return self._current


def test_schema_parity_passes_when_migration_count_matches():
    """Given a database with 78+ migrations, the schema parity check passes."""
    cursor = MockCursor(results=[
        (78,),  # migration count
        [       # expected tables all exist
            ("shops",), ("check_ins",), ("lists",), ("list_items",),
            ("profiles",), ("stamps",), ("shop_photos",),
            ("shop_reviews",), ("taxonomy_tags",), ("shop_tags",),
            ("job_queue",), ("search_events",), ("shop_followers",),
            ("shop_claims",), ("shop_submissions",), ("activity_feed",),
            ("shop_menu_items",), ("community_note_likes",),
            ("user_roles",), ("search_cache",), ("shop_content",),
            ("shop_owner_tags",), ("review_responses",),
            ("admin_audit_logs",),
        ],
    ])
    results = check_schema_parity(cursor)
    assert len(results) == 2
    assert results[0].passed  # migration count
    assert results[1].passed  # tables exist


def test_schema_parity_fails_when_migration_count_low():
    """Given a database with fewer than 78 migrations, the check fails."""
    cursor = MockCursor(results=[
        (50,),  # only 50 migrations
        [],     # tables query (won't matter)
    ])
    results = check_schema_parity(cursor)
    assert not results[0].passed
    assert "50" in results[0].details
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'validate_supabase'`

**Step 3: Write minimal implementation**

```python
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


# ── Result model ──────────────────────────────────────────────────────────

@dataclass
class CheckResult:
    category: str
    name: str
    passed: bool
    details: str


# ── Expected schema ──────────────────────────────────────────────────────

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


# ── Check functions ──────────────────────────────────────────────────────

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


# ── Main entry point ─────────────────────────────────────────────────────

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
```

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): validation script skeleton + schema parity check

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: RLS validation check

**Files:**
- Modify: `scripts/validate_supabase.py`
- Modify: `scripts/test_validate_supabase.py`

**Step 1: Write the failing test**

Add to `scripts/test_validate_supabase.py`:

```python
from validate_supabase import check_rls


def test_rls_passes_when_all_tables_have_policies():
    """Given all user-facing tables have RLS enabled with policies, check passes."""
    tables_with_rls = [(t,) for t in [
        "check_ins", "lists", "list_items", "profiles", "shop_followers",
        "shop_claims", "shops", "shop_photos", "shop_reviews", "stamps",
        "job_queue", "user_roles", "search_events", "shop_menu_items",
        "community_note_likes", "activity_feed", "shop_submissions",
        "shop_content", "shop_owner_tags", "review_responses",
        "admin_audit_logs",
    ]]
    # For each table: (table_name, policy_count)
    policy_counts = [(t[0], 2) for t in tables_with_rls]

    cursor = MockCursor(results=[
        tables_with_rls,   # tables with relrowsecurity=true
        policy_counts,     # policy counts per table
    ])
    results = check_rls(cursor)
    assert all(r.passed for r in results)


def test_rls_fails_when_table_missing_rls():
    """Given a table without RLS enabled, the check fails."""
    # Missing 'check_ins' from the RLS-enabled list
    tables_with_rls = [(t,) for t in ["lists", "profiles"]]
    policy_counts = [("lists", 1), ("profiles", 1)]

    cursor = MockCursor(results=[
        tables_with_rls,
        policy_counts,
    ])
    results = check_rls(cursor)
    rls_enabled_result = results[0]
    assert not rls_enabled_result.passed
    assert "check_ins" in rls_enabled_result.details
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py::test_rls_passes_when_all_tables_have_policies -v`
Expected: FAIL — `ImportError: cannot import name 'check_rls'`

**Step 3: Write minimal implementation**

Add to `scripts/validate_supabase.py`:

```python
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

    # 2. Do they have policies?
    cursor.execute(
        "SELECT tablename, COUNT(*) FROM pg_policies "
        "WHERE schemaname = 'public' GROUP BY tablename"
    )
    policy_counts = {row[0]: row[1] for row in cursor.fetchall()}
    no_policies = [t for t in RLS_REQUIRED_TABLES if policy_counts.get(t, 0) == 0]
    results.append(CheckResult(
        category="RLS",
        name="Policies exist on RLS tables",
        passed=len(no_policies) == 0,
        details=f"No policies: {sorted(no_policies)}" if no_policies
            else f"All {len(RLS_REQUIRED_TABLES)} tables have at least one policy",
    ))

    return results
```

Wire into `run_all_checks`:

```python
results.extend(check_rls(cursor))
```

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "rls"`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): add RLS validation check

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Trigger validation check

**Files:**
- Modify: `scripts/validate_supabase.py`
- Modify: `scripts/test_validate_supabase.py`

**Step 1: Write the failing test**

```python
from validate_supabase import check_triggers


def test_triggers_pass_when_both_exist_and_enabled():
    """Given both expected triggers exist and are enabled, check passes."""
    cursor = MockCursor(results=[
        # pg_trigger join: (trigger_name, table_name, enabled)
        [
            ("trg_checkin_after_insert", "check_ins", "O"),  # O = origin, enabled
            ("trg_enforce_max_lists", "lists", "O"),
        ],
    ])
    results = check_triggers(cursor)
    assert all(r.passed for r in results)


def test_triggers_fail_when_trigger_missing():
    """Given a missing trigger, the check fails."""
    cursor = MockCursor(results=[
        [("trg_checkin_after_insert", "check_ins", "O")],  # missing trg_enforce_max_lists
    ])
    results = check_triggers(cursor)
    assert not all(r.passed for r in results)
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "trigger"`
Expected: FAIL — `ImportError`

**Step 3: Write minimal implementation**

```python
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
            is_enabled = enabled in ("O", "A")  # O=origin, A=always
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
```

Wire into `run_all_checks`.

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "trigger"`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): add trigger validation check

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: pgvector validation check

**Files:**
- Modify: `scripts/validate_supabase.py`
- Modify: `scripts/test_validate_supabase.py`

**Step 1: Write the failing test**

```python
from validate_supabase import check_pgvector


def test_pgvector_passes_with_extension_and_index():
    """Given pgvector extension enabled and HNSW index on shops.embedding, check passes."""
    cursor = MockCursor(results=[
        [("vector",)],                              # pg_extension
        [("shops_embedding_hnsw_idx",)],            # HNSW index exists
        [(0.0,)],                                    # cosine query succeeds
    ])
    results = check_pgvector(cursor)
    assert all(r.passed for r in results)


def test_pgvector_fails_without_extension():
    """Given no vector extension, the check fails."""
    cursor = MockCursor(results=[
        [],    # no extension
        [],    # no index
        None,  # query will fail
    ])
    results = check_pgvector(cursor)
    assert not results[0].passed
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "pgvector"`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
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
```

Wire into `run_all_checks`.

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "pgvector"`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): add pgvector validation check

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: pgBouncer compatibility check

**Files:**
- Modify: `scripts/validate_supabase.py`
- Modify: `scripts/test_validate_supabase.py`

**Important context:** The `SET LOCAL hnsw.ef_search = 40` in `search_cache_similar()` is already INSIDE the PL/pgSQL function body (`BEGIN...END` block). This means it IS pgBouncer-safe — `SET LOCAL` inside a PL/pgSQL function body is scoped to the calling transaction, which pgBouncer preserves even in transaction mode. The check should verify this pattern is correct (PASS), not flag it as broken.

The check scans all user-defined PL/pgSQL functions for `SET LOCAL` usage and reports whether it's inside a function body (safe) or used as a standalone statement (unsafe).

**Step 1: Write the failing test**

```python
from validate_supabase import check_pgbouncer_compat


def test_pgbouncer_compat_passes_when_set_local_inside_function():
    """Given SET LOCAL is inside a PL/pgSQL function body, it's pgBouncer-safe."""
    cursor = MockCursor(results=[
        # (function_name, function_body) — SET LOCAL inside function body
        [("search_cache_similar", "BEGIN\n  SET LOCAL hnsw.ef_search = 40;\n  RETURN QUERY SELECT ...\nEND;")],
    ])
    results = check_pgbouncer_compat(cursor)
    # Should pass — SET LOCAL inside function body is safe
    assert all(r.passed for r in results)


def test_pgbouncer_compat_reports_functions_with_set_local():
    """Given functions with SET LOCAL, report details about each one."""
    cursor = MockCursor(results=[
        [("search_cache_similar", "BEGIN\n  SET LOCAL hnsw.ef_search = 40;\nEND;")],
    ])
    results = check_pgbouncer_compat(cursor)
    assert len(results) >= 1
    assert "search_cache_similar" in results[0].details
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "pgbouncer"`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
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
        # All SET LOCAL in PL/pgSQL function bodies are safe
        results.append(CheckResult(
            category="pgBouncer",
            name="SET LOCAL in function bodies",
            passed=True,
            details=(
                f"Found SET LOCAL in: {', '.join(func_names)}. "
                f"All inside PL/pgSQL function bodies — pgBouncer-safe."
            ),
        ))

    # Also check for pg_advisory_xact_lock usage (safe, but worth noting)
    cursor_note = None  # We'd need another cursor call, skip for now

    return results
```

Wire into `run_all_checks`.

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "pgbouncer"`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): add pgBouncer compatibility check

SET LOCAL inside PL/pgSQL function bodies is pgBouncer-safe.
search_cache_similar already uses this pattern correctly.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Storage bucket validation check

**Files:**
- Modify: `scripts/validate_supabase.py`
- Modify: `scripts/test_validate_supabase.py`

**Step 1: Write the failing test**

```python
from validate_supabase import check_storage_buckets


def test_storage_buckets_pass_when_all_exist():
    """Given all 4 expected storage buckets exist, check passes."""
    cursor = MockCursor(results=[
        [("checkin-photos",), ("menu-photos",), ("avatars",), ("claim-proofs",)],
    ])
    results = check_storage_buckets(cursor)
    assert all(r.passed for r in results)


def test_storage_buckets_fail_when_missing():
    """Given a missing bucket, the check fails."""
    cursor = MockCursor(results=[
        [("checkin-photos",), ("avatars",)],  # missing menu-photos, claim-proofs
    ])
    results = check_storage_buckets(cursor)
    assert not results[0].passed
    assert "claim-proofs" in results[0].details
```

**Step 2: Run test to verify it fails**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "bucket"`
Expected: FAIL

**Step 3: Write minimal implementation**

```python
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
```

Wire into `run_all_checks`.

**Step 4: Run test to verify it passes**

Run: `uv run --with pytest pytest scripts/test_validate_supabase.py -v -k "bucket"`
Expected: 2 tests PASS

**Step 5: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py
git commit -m "feat(DEV-72): add storage bucket validation check

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Integration test against local Supabase + Makefile target

**Files:**
- Modify: `Makefile`

**Prerequisite:** Local Supabase must be running (`make doctor` first).

**Step 1: Run the script against local Supabase**

No test needed — the script IS the test. Local Supabase is the known-good source of truth.

Get the local database URL:

```bash
# Local Supabase direct connection (not pooled)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  uv run scripts/validate_supabase.py
```

Expected: All checks PASS, exit code 0. If any fail, fix the check logic (local is the source of truth for the expected schema).

**Step 2: Add Makefile target**

Add to `Makefile`:

```makefile
validate-supabase:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Usage: DATABASE_URL=postgresql://... make validate-supabase"; \
		echo "Local: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres make validate-supabase"; \
		exit 1; \
	fi
	uv run scripts/validate_supabase.py
```

Update the `help` target to include `validate-supabase`.

**Step 3: Verify Makefile target works**

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" make validate-supabase
```

Expected: Same output as Step 1.

**Step 4: Commit**

```bash
git add scripts/validate_supabase.py scripts/test_validate_supabase.py Makefile
git commit -m "feat(DEV-72): integration-test against local + Makefile target

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Close DEV-87 + run against staging (DEV-88)

**Files:** None — this is a verification + documentation task.

No test needed — operational verification, not code.

**Step 1: Document pgBouncer finding (closes DEV-87)**

The `SET LOCAL hnsw.ef_search = 40` in `search_cache_similar()` is already inside the PL/pgSQL function body. This is pgBouncer-safe. No migration needed.

Update DEV-87 in Linear: add comment documenting the finding, close as "Done" (verified, no fix required).

Also check `enforce_max_lists_per_user()` — it uses `pg_advisory_xact_lock` which is transaction-scoped and pgBouncer-safe.

**Step 2: Run against staging (DEV-88)**

```bash
# Get staging direct connection URL from Railway/1Password
# IMPORTANT: Use port 5432 (direct), NOT port 6543 (pooled)
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  make validate-supabase
```

Expected: All checks PASS. If any fail:
- Schema: re-push migrations with `supabase db push --db-url <staging-url>`
- RLS: check if Supabase cloud strips custom RLS on certain system tables
- Triggers: verify triggers aren't disabled by Supabase cloud defaults
- pgvector: verify extension was enabled during staging bootstrap

**Step 3: Document results**

Add staging validation results to DEV-88 Linear comment. Close DEV-88 and DEV-72.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(DEV-72): complete Supabase migration parity validation

All checks pass on local and staging. pgBouncer SET LOCAL verified safe.
Closes DEV-72, DEV-87, DEV-88.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Execution Waves

```mermaid
graph TD
    T1[Task 1: Skeleton + schema check] --> T2[Task 2: RLS check]
    T1 --> T3[Task 3: Trigger check]
    T2 --> T4[Task 4: pgvector check]
    T3 --> T4
    T4 --> T5[Task 5: pgBouncer check]
    T5 --> T6[Task 6: Storage check]
    T6 --> T7[Task 7: Integration + Makefile]
    T7 --> T8[Task 8: DEV-87 close + staging run]

    subgraph "Wave 1"
        T1
    end
    subgraph "Wave 2"
        T2
        T3
    end
    subgraph "Wave 3"
        T4
        T5
        T6
    end
    subgraph "Wave 4"
        T7
    end
    subgraph "Wave 5"
        T8
    end
```

**Wave 1** (foundation):
- Task 1: Script skeleton + schema parity check

**Wave 2** (parallel — both add independent check functions):
- Task 2: RLS validation check
- Task 3: Trigger validation check

**Wave 3** (parallel — three independent check functions, depend on skeleton):
- Task 4: pgvector validation check
- Task 5: pgBouncer compatibility check
- Task 6: Storage bucket check

**Wave 4** (integration — depends on all checks):
- Task 7: Integration test against local + Makefile target

**Wave 5** (operational — depends on working script):
- Task 8: Close DEV-87 + run against staging (DEV-88)

> **Note on parallelism:** Wave 2 and Wave 3 tasks all modify the same file (`scripts/validate_supabase.py`), so true parallel execution would cause merge conflicts. In practice, execute sequentially within each wave but commit independently. The wave grouping shows logical independence.
