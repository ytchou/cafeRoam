-- Fix PDPA gap: review_responses.owner_id was missing ON DELETE CASCADE.
-- When a user's auth account is deleted, their review responses must be deleted too.
-- Inline REFERENCES syntax auto-names the constraint "review_responses_owner_id_fkey".

ALTER TABLE review_responses
  DROP CONSTRAINT review_responses_owner_id_fkey,
  ADD CONSTRAINT review_responses_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
