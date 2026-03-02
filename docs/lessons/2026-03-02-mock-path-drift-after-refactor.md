# Lesson: Mock Path Drift After Module Refactoring

**Date:** 2026-03-02
**PR:** feat/admin-dashboard
**Severity:** All admin tests would have broken after extracting require_admin

## What Happened

`_require_admin` was copy-pasted in 3 files (`admin.py`, `admin_shops.py`, `admin_taxonomy.py`). When extracted to `api/deps.py` as `require_admin`, all tests that patched `api.admin_shops.settings` / `api.admin_taxonomy.settings` would fail — because `settings` was only imported in those files to power `_require_admin`. After the refactor, `settings` no longer exists in those module namespaces.

`unittest.mock.patch("module.attr")` patches the name in the module where it is **used**, not where it is **defined**. After moving logic, the patch target moves too.

## Prevention Rules

1. **When you extract a module into `deps.py` or a shared utility, immediately update all test patch paths.**
2. **`patch("api.X.settings")` should become `patch("api.deps.settings")`** whenever the settings usage moves to `deps.py`.
3. **Run tests after every refactor** — don't batch "fix tests later". Broken tests after a refactor are almost always mock path drift.
4. **Prefer `app.dependency_overrides[require_admin]`** over patching settings — this tests the actual FastAPI dependency resolution chain.

## The Right Pattern

```python
# BAD: after extracting to deps.py, this silently patches nothing
with patch("api.admin_shops.settings") as mock_settings:
    mock_settings.admin_user_ids = ["admin-id"]

# GOOD: patch the canonical location
with patch("api.deps.settings") as mock_settings:
    mock_settings.admin_user_ids = ["admin-id"]

# BEST: override the dependency directly
app.dependency_overrides[require_admin] = lambda: {"id": "admin-id"}
```

---

## Variant: MagicMock Chain Drift After Query Refactor

**Date:** 2026-03-02
**Context:** Adding `.limit(200)` to bulk_approve query

### What happened
Tests mocked `.eq().execute()`. When production code gained `.limit(200)` between `.eq()` and `.execute()`, tests still passed because MagicMock auto-creates chain links and iterating an unconfigured MagicMock yields `[]` — the right answer, for the wrong reason.

### Prevention
After any DB query refactor (adding `.limit()`, `.order()`, `.range()`), search for test mocks on that query's chain. Verify mock chains match the full production chain. `execute.return_value` anchored too early is the smell.

## Related

- `ERROR-PREVENTION.md` → "Test mock path drift" section
