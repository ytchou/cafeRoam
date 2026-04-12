CREATE TABLE api_usage_log (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    provider            TEXT         NOT NULL,           -- 'anthropic' | 'openai' | 'apify'
    task                TEXT         NOT NULL,           -- 'enrich_shop' | 'classify_photo' | etc.
    model               TEXT,                            -- null for apify
    tokens_input        INTEGER,                         -- null for apify
    tokens_output       INTEGER,                         -- null for apify
    tokens_cache_write  INTEGER,                         -- anthropic cache_creation_input_tokens
    tokens_cache_read   INTEGER,                         -- anthropic cache_read_input_tokens
    compute_units       NUMERIC(12, 6),                  -- null for LLM providers
    cost_usd            NUMERIC(10, 6),                  -- null for apify (computed at query time)
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX api_usage_log_created_at_idx     ON api_usage_log (created_at);
CREATE INDEX api_usage_log_provider_task_idx  ON api_usage_log (provider, task);

ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; deny all public access explicitly
CREATE POLICY "no_public_access"
    ON api_usage_log FOR ALL
    TO anon, authenticated
    USING (false);
