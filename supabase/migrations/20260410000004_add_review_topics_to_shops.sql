ALTER TABLE shops ADD COLUMN IF NOT EXISTS review_topics JSONB;

COMMENT ON COLUMN shops.review_topics IS
  'Top recurring review topics extracted by summarize_reviews. Schema: [{topic: str, count: int}]';
