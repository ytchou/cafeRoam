-- Register hourly cleanup job for expired search cache entries.
-- Uses pg_cron. The DO block checks for the extension before scheduling,
-- so this migration is safe to apply even on instances where pg_cron is
-- not yet enabled (local dev, staging without the extension).
--
-- To enable pg_cron on Supabase: Dashboard → Extensions → pg_cron → Enable.
-- Once enabled, re-run this migration (or run the PERFORM cron.schedule call
-- manually) to register the job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-search-cache',
      '0 * * * *',
      $$DELETE FROM search_cache WHERE expires_at < now()$$
    );
  END IF;
END $$;
