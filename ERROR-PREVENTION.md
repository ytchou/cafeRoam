# Error Prevention: CafeRoam (啡遊)

Known errors, their symptoms, causes, and fixes. Add an entry every time you hit a non-obvious problem.

**Format:** Symptom → Root cause → Fix → How to prevent

---

## Template

### [Error name / symptom]

**Symptom:** [What you see when this happens]

**Root cause:** [Why it happens]

**Fix:**
```bash
# Commands or steps to fix it
```

**Prevention:** [What to check or do to avoid this in the future]

---

## Supabase Migration Out of Sync

**Symptom:** `supabase db push` fails with "migration already applied" or schema drift errors.

**Root cause:** Local migration history is out of sync with what's been applied to the database, usually from running raw SQL in the Supabase dashboard instead of through migrations.

**Fix:**
```bash
supabase db diff           # See what's different
supabase db reset          # Nuclear option: reset local DB entirely and reapply all migrations
```

**Prevention:** Never run schema-changing SQL directly in the Supabase dashboard. Always create a migration file via `supabase migration new [name]` and apply with `supabase db push`.

---

## pgvector Extension Not Available

**Symptom:** `ERROR: type "vector" does not exist` when running migrations locally.

**Root cause:** pgvector extension not enabled in local Supabase instance.

**Fix:**
```sql
-- Add to migration file or run manually once:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Prevention:** Include `CREATE EXTENSION IF NOT EXISTS vector;` as the first migration. The seed script should check for this before inserting embeddings.

---

## RLS Policy Blocking Authenticated Requests

**Symptom:** Authenticated API routes return empty results or 403 errors despite valid session.

**Root cause:** RLS policy missing or incorrectly written for the table being queried. Common mistake: forgetting `auth.uid()` check on user-scoped tables.

**Fix:**
```sql
-- Check existing policies:
SELECT * FROM pg_policies WHERE tablename = '[table_name]';

-- Standard user-scoped read policy:
CREATE POLICY "Users can read own data" ON [table]
  FOR SELECT USING (auth.uid() = user_id);
```

**Prevention:** After every new table migration, immediately write and test RLS policies. Run `supabase db diff` to confirm policies are in migration files, not just applied manually.

---

*Add entries here as you discover them.*
