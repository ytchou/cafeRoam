# supabase-py: .neq("col", "null") does not mean IS NOT NULL

**Date:** 2026-03-19
**Context:** Community notes feed incorrectly included check-ins with no review text.

**What happened:** The query used `.neq("review_text", "null")` intending to filter out NULL values. PostgREST interprets this as the string comparison `review_text != 'null'`, not SQL `IS NOT NULL`. Every row passes when `review_text IS NULL` because NULL is not equal to the string "null" either (NULLs pass both `=` and `!=` comparisons in SQL comparisons against non-NULL values under certain PostgREST behaviours).

**Root cause:** supabase-py's `.neq()` generates `?column=neq.value` which PostgREST treats as a value comparison, not a NULL check.

**Prevention:** Always use `.not_.is_("column", "null")` for IS NOT NULL. The string "null" is PostgREST's keyword for SQL NULL in `.is_()` / `.not_.is_()` operators.
