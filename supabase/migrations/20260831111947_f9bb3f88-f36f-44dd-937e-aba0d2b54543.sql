CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'My Detailing Co',
  slug TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  telegram_auth_code TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  sedan_base NUMERIC NOT NULL DEFAULT 150,
  suv_base NUMERIC NOT NULL DEFAULT 185,
  truck_base NUMERIC NOT NULL DEFAULT 210,
  addon_pet_hair NUMERIC NOT NULL DEFAULT 40,
  addon_stains NUMERIC NOT NULL DEFAULT 55,
  addon_ceramic NUMERIC NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Detailers view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Detailers create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Detailers update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  addons TEXT[] NOT NULL DEFAULT '{}',
  estimated_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT INSERT ON public.quotes TO anon;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a quote request" ON public.quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Detailers view own quotes" ON public.quotes FOR SELECT TO authenticated USING (auth.uid() = detailer_id);
CREATE POLICY "Detailers delete own quotes" ON public.quotes FOR DELETE TO authenticated USING (auth.uid() = detailer_id);

CREATE INDEX quotes_detailer_created_idx ON public.quotes (detailer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_public_pricing(_slug TEXT)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  slug TEXT,
  sedan_base NUMERIC,
  suv_base NUMERIC,
  truck_base NUMERIC,
  addon_pet_hair NUMERIC,
  addon_stains NUMERIC,
  addon_ceramic NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.business_name, p.slug, p.sedan_base, p.suv_base, p.truck_base,
         p.addon_pet_hair, p.addon_stains, p.addon_ceramic
  FROM public.profiles p
  WHERE p.slug = lower(_slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pricing(TEXT) TO anon, authenticated;