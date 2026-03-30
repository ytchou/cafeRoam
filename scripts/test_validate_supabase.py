"""Tests for validate_supabase.py — mock cursor at DB boundary."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from validate_supabase import (
    CheckResult,
    check_pgbouncer_compat,
    check_pgvector,
    check_rls,
    check_schema_parity,
    check_storage_buckets,
    check_triggers,
    CRITICAL_COLUMNS,
)


class MockCursor:
    """Minimal cursor mock that returns pre-set results.

    Results are consumed in order — one entry per execute() call.
    If execute() is called more times than results provided, an
    AssertionError is raised with the offending query for easier debugging.
    """

    def __init__(self, results: list):
        self._results = iter(results)
        self._call_count = 0

    def execute(self, query, params=None):
        self._call_count += 1
        try:
            self._current = next(self._results)
        except StopIteration:
            raise AssertionError(
                f"MockCursor exhausted on call #{self._call_count}: "
                f"execute() called more times than results provided. "
                f"Query: {query[:80]!r}"
            )

    def fetchone(self):
        return self._current

    def fetchall(self):
        return self._current


def test_schema_parity_passes_when_migration_count_matches():
    """Given a database with 76+ migrations and all expected tables and columns, schema check passes."""
    all_critical_columns = [
        (table, col)
        for table, cols in CRITICAL_COLUMNS.items()
        for col in cols
    ]
    cursor = MockCursor(results=[
        (76,),  # migration count
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
        all_critical_columns,  # critical columns spot-check
    ])
    results = check_schema_parity(cursor)
    assert len(results) == 3
    assert results[0].passed  # migration count
    assert results[1].passed  # tables exist
    assert results[2].passed  # column spot-check


def test_schema_parity_passes_when_critical_columns_exist():
    """Given all critical columns exist on key tables, the column check passes."""
    all_columns = []
    for table, columns in CRITICAL_COLUMNS.items():
        for col in columns:
            all_columns.append((table, col))

    cursor = MockCursor(results=[
        (76,),   # migration count
        [        # tables
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
        all_columns,  # column spot-check
    ])
    results = check_schema_parity(cursor)
    assert len(results) == 3
    assert results[2].passed
    assert "critical columns" in results[2].details.lower()


def test_schema_parity_fails_when_critical_column_missing():
    """Given a critical column is absent, the column spot-check fails."""
    # Return only a subset — omit 'embedding' from shops
    present_columns = [
        ("shops", "id"), ("shops", "name"),
        ("check_ins", "id"), ("check_ins", "user_id"), ("check_ins", "shop_id"), ("check_ins", "created_at"),
        ("lists", "id"), ("lists", "user_id"), ("lists", "name"),
        ("search_events", "id"), ("search_events", "query"), ("search_events", "created_at"),
    ]
    cursor = MockCursor(results=[
        (76,),
        [
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
        present_columns,
    ])
    results = check_schema_parity(cursor)
    assert len(results) == 3
    assert not results[2].passed
    assert "shops.embedding" in results[2].details


def test_schema_parity_fails_when_migration_count_low():
    """Given a database with fewer than 76 migrations, the migration count check fails."""
    cursor = MockCursor(results=[
        (50,),  # only 50 migrations
        [],     # tables query
        [],     # columns query
    ])
    results = check_schema_parity(cursor)
    assert not results[0].passed
    assert "50" in results[0].details


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
    policy_counts = [(t[0], 2) for t in tables_with_rls]

    cursor = MockCursor(results=[
        tables_with_rls,
        policy_counts,
    ])
    results = check_rls(cursor)
    assert all(r.passed for r in results)


def test_rls_fails_when_table_missing_rls():
    """Given a table without RLS enabled, the check fails."""
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


def test_triggers_pass_when_both_exist_and_enabled():
    """Given both expected triggers exist and are enabled, check passes."""
    cursor = MockCursor(results=[
        [
            ("trg_checkin_after_insert", "check_ins", "O"),
            ("trg_enforce_max_lists", "lists", "O"),
        ],
    ])
    results = check_triggers(cursor)
    assert all(r.passed for r in results)


def test_triggers_fail_when_trigger_missing():
    """Given a missing trigger, the check fails."""
    cursor = MockCursor(results=[
        [("trg_checkin_after_insert", "check_ins", "O")],
    ])
    results = check_triggers(cursor)
    assert not all(r.passed for r in results)


def test_pgvector_passes_with_extension_and_index():
    """Given pgvector extension enabled and HNSW index on shops.embedding, check passes."""
    cursor = MockCursor(results=[
        [("vector",)],                              # pg_extension (fetchall)
        [("shops_embedding_hnsw_idx",)],            # HNSW index (fetchall)
        (0.0,),                                      # cosine query (fetchone)
    ])
    results = check_pgvector(cursor)
    assert all(r.passed for r in results)


def test_pgvector_passes_with_extension_but_no_embeddings():
    """Given pgvector extension enabled but no embeddings loaded, check still passes."""
    cursor = MockCursor(results=[
        [("vector",)],              # extension exists
        [("shops_embedding_hnsw_idx",)],  # HNSW index exists
        None,                       # no rows returned (no seed data yet)
    ])
    results = check_pgvector(cursor)
    assert results[0].passed   # extension
    assert results[1].passed   # index
    assert results[2].passed   # cosine query functional even without data
    assert "no embeddings" in results[2].details.lower()


def test_pgvector_fails_without_extension():
    """Given no vector extension, the check fails."""
    cursor = MockCursor(results=[
        [],    # no extension
        [],    # no index
        None,  # query will fail
    ])
    results = check_pgvector(cursor)
    assert not results[0].passed


def test_pgbouncer_compat_passes_when_set_local_inside_function():
    """Given SET LOCAL is inside a PL/pgSQL function body, it's pgBouncer-safe."""
    cursor = MockCursor(results=[
        [("search_cache_similar", "BEGIN\n  SET LOCAL hnsw.ef_search = 40;\n  RETURN QUERY SELECT ...\nEND;", "plpgsql")],
    ])
    results = check_pgbouncer_compat(cursor)
    assert all(r.passed for r in results)


def test_pgbouncer_compat_reports_functions_with_set_local():
    """Given PL/pgSQL functions with SET LOCAL, report their names in details."""
    cursor = MockCursor(results=[
        [("search_cache_similar", "BEGIN\n  SET LOCAL hnsw.ef_search = 40;\nEND;", "plpgsql")],
    ])
    results = check_pgbouncer_compat(cursor)
    assert len(results) >= 1
    assert "search_cache_similar" in results[0].details


def test_pgbouncer_compat_fails_when_set_local_in_sql_function():
    """Given SET LOCAL in a language sql function, the check fails (not pgBouncer-safe)."""
    cursor = MockCursor(results=[
        [("unsafe_func", "SET LOCAL work_mem = '256MB'", "sql")],
    ])
    results = check_pgbouncer_compat(cursor)
    assert len(results) == 1
    assert not results[0].passed
    assert "unsafe_func" in results[0].details


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
        [("checkin-photos",), ("avatars",)],
    ])
    results = check_storage_buckets(cursor)
    assert not results[0].passed
    assert "claim-proofs" in results[0].details
