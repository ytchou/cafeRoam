-- Add district FK to shops for geo landing pages (DEV-201)
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id);

CREATE INDEX IF NOT EXISTS idx_shops_district_id
  ON public.shops (district_id);
