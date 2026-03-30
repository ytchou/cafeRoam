"""Tests for validate_supabase.py — mock cursor at DB boundary."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from validate_supabase import CheckResult, check_rls, check_schema_parity, check_triggers


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
