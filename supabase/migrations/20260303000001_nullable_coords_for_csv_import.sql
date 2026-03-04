-- Allow NULL lat/lng so CSV-imported shops can be inserted before scraping fills them in.
-- Only pending_url_check/pending_review shops will have NULL coords; live shops always have them.
ALTER TABLE public.shops ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.shops ALTER COLUMN longitude DROP NOT NULL;
