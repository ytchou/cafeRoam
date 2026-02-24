# Design: Database & Infrastructure

> Date: 2026-02-24
> Status: Approved
> Scope: Phase 1 — Database schema, pgvector, RLS, job queue, background workers, provider adapters

---

## Context

Pre-build is complete (10/10 search validation). Project scaffold is done. This design covers the next Phase 1 section: **Database & Infrastructure** + **Background Worker Infrastructure**, designed together because data flows end-to-end from workers through the DB to the app.

**Decisions made:**

- Local Supabase only (no cloud project yet)
- DB-as-Queue pattern (Postgres `job_queue` table, no Redis)
- Hybrid triggers: cron for batch work + DB triggers for real-time events
- Full worker implementation (not just scaffold)
- Minimal test seed data (real pipeline runs later in Data Pipeline section)

---

## 1. Core Schema

### 1.1 Shop Tables

```sql
-- Core shop data (flat, frequently queried)
CREATE TABLE shops (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  address        TEXT NOT NULL,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  mrt            TEXT,
  phone          TEXT,
  website        TEXT,
  opening_hours  JSONB,
  rating         NUMERIC(2,1),
  review_count   INTEGER NOT NULL DEFAULT 0,
  price_range    TEXT,
  description    TEXT,
  menu_url       TEXT,

  -- Source tracking
  cafenomad_id   TEXT UNIQUE,
  google_place_id TEXT UNIQUE,

  -- Enrichment metadata
  enriched_at    TIMESTAMPTZ,
  enriched_model TEXT,

  -- Multi-mode scores (materialized from enrichment)
  mode_work      NUMERIC(3,2),
  mode_rest      NUMERIC(3,2),
  mode_social    NUMERIC(3,2),

  -- Embedding (pgvector, 1536 dims for text-embedding-3-small)
  embedding      vector(1536),

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shop photos (from Google Maps scraping, external URLs)
CREATE TABLE shop_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  category   TEXT,
  is_menu    BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Google Maps reviews (for display + enrichment input)
CREATE TABLE shop_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  stars        SMALLINT CHECK (stars BETWEEN 1 AND 5),
  published_at TEXT,
  language     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.2 Taxonomy & Tagging

```sql
-- Canonical taxonomy tags (seeded from taxonomy.json)
CREATE TABLE taxonomy_tags (
  id         TEXT PRIMARY KEY,
  dimension  TEXT NOT NULL CHECK (dimension IN
    ('functionality', 'time', 'ambience', 'mode', 'coffee')),
  label      TEXT NOT NULL,
  label_zh   TEXT NOT NULL,
  aliases    TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shop-tag assignments (from enrichment)
CREATE TABLE shop_tags (
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  tag_id          TEXT NOT NULL REFERENCES taxonomy_tags(id) ON DELETE CASCADE,
  confidence      NUMERIC(3,2) NOT NULL,
  distinctiveness NUMERIC(5,4) DEFAULT 0,
  PRIMARY KEY (shop_id, tag_id)
);
```

### 1.3 User Tables

```sql
-- User profile (extends Supabase auth.users)
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  pdpa_consent_at TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-curated lists (max 3 per user — enforced at API level + DB check)
CREATE TABLE lists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- List membership (relational join table)
CREATE TABLE list_items (
  list_id  UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  shop_id  UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, shop_id)
);

-- Check-ins (photo required, stored in Supabase Storage)
CREATE TABLE check_ins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id        UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  photo_urls     TEXT[] NOT NULL CHECK (array_length(photo_urls, 1) >= 1),
  menu_photo_url TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stamps (one design per shop, earned on check-in)
CREATE TABLE stamps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  check_in_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  design_url  TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.4 Job Queue

```sql
CREATE TABLE job_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     TEXT NOT NULL CHECK (job_type IN (
    'enrich_shop',
    'enrich_menu_photo',
    'generate_embedding',
    'staleness_sweep',
    'weekly_email'
  )),
  payload      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'dead_letter'
  )),
  priority     SMALLINT NOT NULL DEFAULT 0,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 3,
  error        TEXT,
  locked_by    TEXT,
  locked_at    TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. DB Trigger: Menu Photo Enrichment

```sql
CREATE OR REPLACE FUNCTION queue_menu_photo_enrichment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.menu_photo_url IS NOT NULL THEN
    INSERT INTO job_queue (job_type, payload)
    VALUES (
      'enrich_menu_photo',
      jsonb_build_object('check_in_id', NEW.id, 'shop_id', NEW.shop_id,
                         'menu_photo_url', NEW.menu_photo_url)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checkin_menu_photo
  AFTER INSERT ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION queue_menu_photo_enrichment();
```

---

## 3. RLS Policies

### Public read (directory browsing without auth)

| Table           | Policy                      | Rule             |
| --------------- | --------------------------- | ---------------- |
| `shops`         | `shops_public_read`         | `SELECT` for all |
| `shop_photos`   | `shop_photos_public_read`   | `SELECT` for all |
| `shop_reviews`  | `shop_reviews_public_read`  | `SELECT` for all |
| `taxonomy_tags` | `taxonomy_tags_public_read` | `SELECT` for all |
| `shop_tags`     | `shop_tags_public_read`     | `SELECT` for all |

### User-owned data (authenticated only, own data)

| Table        | Operations                     | Rule                                     |
| ------------ | ------------------------------ | ---------------------------------------- |
| `profiles`   | SELECT, INSERT, UPDATE         | `auth.uid() = id`                        |
| `lists`      | SELECT, INSERT, UPDATE, DELETE | `auth.uid() = user_id`                   |
| `list_items` | SELECT, INSERT, DELETE         | Owner of parent list (`EXISTS` subquery) |
| `check_ins`  | SELECT, INSERT                 | `auth.uid() = user_id`                   |
| `stamps`     | SELECT                         | `auth.uid() = user_id`                   |

### No client access

| Table       | Reason                                      |
| ----------- | ------------------------------------------- |
| `job_queue` | Workers use service role key (bypasses RLS) |

---

## 4. Performance Indexes

```sql
-- Geospatial
CREATE INDEX idx_shops_geo ON shops (latitude, longitude);

-- Vector search (HNSW, cosine similarity)
CREATE INDEX idx_shops_embedding ON shops
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Mode filtering (partial indexes)
CREATE INDEX idx_shops_mode_work ON shops (mode_work) WHERE mode_work IS NOT NULL;
CREATE INDEX idx_shops_mode_rest ON shops (mode_rest) WHERE mode_rest IS NOT NULL;
CREATE INDEX idx_shops_mode_social ON shops (mode_social) WHERE mode_social IS NOT NULL;

-- Tags
CREATE INDEX idx_shop_tags_shop ON shop_tags (shop_id);
CREATE INDEX idx_shop_tags_tag ON shop_tags (tag_id);

-- User data
CREATE INDEX idx_lists_user ON lists (user_id);
CREATE INDEX idx_check_ins_user ON check_ins (user_id, created_at DESC);
CREATE INDEX idx_check_ins_shop ON check_ins (shop_id);
CREATE INDEX idx_stamps_user ON stamps (user_id, earned_at DESC);

-- Photos
CREATE INDEX idx_shop_photos_shop ON shop_photos (shop_id, sort_order);

-- Job queue (worker polling)
CREATE INDEX idx_job_queue_pending
  ON job_queue (priority DESC, scheduled_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_job_queue_failed
  ON job_queue (created_at DESC)
  WHERE status IN ('failed', 'dead_letter');
```

**Index rationale:**

- **HNSW over IVFFlat**: Better recall at 200-500 shop scale. Self-maintaining (no periodic rebuild).
- **`vector_cosine_ops`**: Matches prebuild search prototype.
- **Partial indexes on mode scores**: Only index non-null values.

---

## 5. Worker Architecture

### 5.1 Directory Structure

```
workers/
├── index.ts                    # Entry point: poll loop + cron scheduler
├── queue.ts                    # Job queue client: claim, complete, fail, dead-letter
├── scheduler.ts                # Cron definitions
├── handlers/
│   ├── enrich-shop.ts          # Full shop enrichment via ILLMProvider
│   ├── enrich-menu-photo.ts    # Menu photo enrichment via ILLMProvider
│   ├── generate-embedding.ts   # Embedding via IEmbeddingsProvider
│   ├── staleness-sweep.ts      # Find stale shops, queue enrich_shop jobs
│   └── weekly-email.ts         # Send curated email via IEmailProvider
└── lib/
    ├── worker-supabase.ts      # Supabase service-role client
    └── logger.ts               # Structured JSON logging
```

### 5.2 Worker Flow

1. `index.ts` starts two loops:
   - **Poll loop** (30s interval): Claims pending jobs via `FOR UPDATE SKIP LOCKED`
   - **Cron scheduler** (`node-cron`): Inserts scheduled jobs at defined intervals
2. Claimed jobs are dispatched to the appropriate handler
3. Handlers use provider abstractions (`ILLMProvider`, `IEmbeddingsProvider`, `IEmailProvider`)
4. On success: mark `completed`. On failure: increment `attempts`, if `attempts >= max_attempts` then `dead_letter`

### 5.3 Cron Schedule

| Job               | Schedule                  | Description                                                                |
| ----------------- | ------------------------- | -------------------------------------------------------------------------- |
| `staleness_sweep` | Daily 3:00 AM TWN (UTC+8) | Find shops with `enriched_at` older than 90 days, queue `enrich_shop` jobs |
| `weekly_email`    | Monday 9:00 AM TWN        | Queue email send for all opted-in users                                    |

### 5.4 Job Claiming SQL

```sql
UPDATE job_queue
SET status = 'processing', locked_by = $1, locked_at = now(), attempts = attempts + 1
WHERE id = (
  SELECT id FROM job_queue
  WHERE status = 'pending' AND scheduled_at <= now()
  ORDER BY priority DESC, scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

---

## 6. Provider Adapter Implementations

Workers require these adapters to function:

| Provider              | Adapter                | SDK                 | Purpose                                    |
| --------------------- | ---------------------- | ------------------- | ------------------------------------------ |
| `ILLMProvider`        | `anthropic.adapter.ts` | `@anthropic-ai/sdk` | Shop enrichment + menu photo extraction    |
| `IEmbeddingsProvider` | `openai.adapter.ts`    | `openai`            | Vector generation (text-embedding-3-small) |
| `IEmailProvider`      | `resend.adapter.ts`    | `resend`            | Weekly curated email                       |

Maps and Analytics adapters are frontend-only; not needed for workers.

---

## 7. Migration File Plan

```
supabase/migrations/
├── 20260224000001_enable_extensions.sql
├── 20260224000002_create_shop_tables.sql
├── 20260224000003_create_taxonomy.sql
├── 20260224000004_create_user_tables.sql
├── 20260224000005_create_job_queue.sql
├── 20260224000006_create_indexes.sql
├── 20260224000007_create_rls_policies.sql
└── 20260224000008_seed_taxonomy.sql
```

Taxonomy seed is a migration (not `seed.sql`) because it's canonical data required in every environment. `seed.sql` is for throwaway test data only.

---

## 8. Local Dev Setup

```bash
supabase init                          # Creates supabase/ directory
supabase start                         # Starts Docker containers
supabase db push                       # Applies all migrations
```

Environment variables for `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
```

---

## 9. Testing Strategy

| What              | How                                                     | Priority |
| ----------------- | ------------------------------------------------------- | -------- |
| Schema validity   | `supabase db push` succeeds                             | P0       |
| RLS policies      | Integration tests: user A can't read user B's data      | P0       |
| PDPA cascade      | Delete auth user, verify all dependent data gone        | P0       |
| Job queue trigger | Insert check-in with menu photo, verify job row created | P1       |
| Vector search     | Insert shop with embedding, run cosine similarity       | P1       |
| Worker handlers   | Unit tests with mocked providers                        | P1       |
| 3-list cap        | API rejects 4th list creation                           | P1       |

---

## 10. Type Updates Required

- Add `'coffee'` to `TaxonomyDimension` type in `lib/types/index.ts`
- Update `List` interface to remove `shopIds` array (replaced by `list_items` join table)
