-- 20260403000001_pdpa_analytics_opt_out_and_owner_terms.sql
-- DEV-193: consent withdrawal flag on profiles
-- DEV-192: owner analytics terms acceptance on shop_claims

-- Users can opt out of having their data included in shop owner analytics.
-- Default ON (consent granted at signup). OFF excludes future contributions.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS analytics_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Track when a verified shop owner acknowledged the analytics data usage terms.
-- NULL = not yet acknowledged. Required before accessing analytics dashboard.
ALTER TABLE public.shop_claims
  ADD COLUMN IF NOT EXISTS analytics_terms_accepted_at TIMESTAMPTZ;
