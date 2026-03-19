# DB column name mismatch masked by mocked tests
**Date:** 2026-03-19
**Context:** Profile Polaroid feature — backend stamps API extended with diary note from check_ins
**What happened:** The query selected `check_ins(photo_urls, diary_note)` but the actual DB column is `note`. The endpoint silently returned `null` for all diary notes. The backend test passed because it mocked the Supabase response with the expected `diary_note` key — the mock never hit the real DB.
**Root cause:** Field was named in the domain layer (`diary_note`) before verifying the persistence layer column name. The mock test proved the flattening logic worked but not that the query was valid.
**Prevention:** When adding a JOIN column to a Supabase select query, always cross-reference the migration file for the exact column name before writing the test mock. Mocks bypass query validation — the migration is the source of truth.
