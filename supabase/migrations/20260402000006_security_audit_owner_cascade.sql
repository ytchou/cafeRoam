-- Security audit: add ON DELETE CASCADE to owner_id FKs on owner tables.
-- These tables relied solely on application-level deletion (profile_service.delete_owner_data).
-- Adding DB-level CASCADE as a safety net for PDPA compliance.

ALTER TABLE review_responses
  DROP CONSTRAINT IF EXISTS review_responses_owner_id_fkey,
  ADD CONSTRAINT review_responses_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE shop_content
  DROP CONSTRAINT IF EXISTS shop_content_owner_id_fkey,
  ADD CONSTRAINT shop_content_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE shop_owner_tags
  DROP CONSTRAINT IF EXISTS shop_owner_tags_owner_id_fkey,
  ADD CONSTRAINT shop_owner_tags_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
