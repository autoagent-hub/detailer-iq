ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS notify_telegram boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_include_photos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_include_notes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_photos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vehicle_categories jsonb NOT NULL DEFAULT '[
    {"key":"sedan","label":"Sedan / Coupe","sub":"2-5 seats, standard cabin","uplift":0,"enabled":true},
    {"key":"suv","label":"SUV / Crossover","sub":"3rd row, extra carpet","uplift":35,"enabled":true},
    {"key":"truck","label":"Truck / Van","sub":"Bed, cargo & tall panels","uplift":60,"enabled":true},
    {"key":"motorcycle","label":"Motorcycle / ATV","sub":"Two wheels, exposed trim","uplift":-40,"enabled":false},
    {"key":"rv","label":"RV / Box Truck","sub":"Oversized, extra hours","uplift":150,"enabled":false}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS packages jsonb NOT NULL DEFAULT '[
    {"key":"express_wash","label":"Express Wash & Dry","sub":"Exterior hand wash, wheels, towel dry","price":60,"enabled":true},
    {"key":"interior_detail","label":"Interior Detail","sub":"Vacuum, wipe-down, glass, mats","price":120,"enabled":true},
    {"key":"exterior_detail","label":"Exterior Detail","sub":"Decon wash, clay, sealant","price":140,"enabled":true},
    {"key":"full_detail","label":"Full Detail","sub":"Inside and out, top to bottom","price":190,"enabled":true},
    {"key":"showroom","label":"Showroom Package","sub":"Full detail plus 1-step polish","price":320,"enabled":true},
    {"key":"maintenance","label":"Maintenance Clean","sub":"For regular monthly clients","price":85,"enabled":false}
  ]'::jsonb;

DROP FUNCTION IF EXISTS public.get_public_pricing(text);
CREATE FUNCTION public.get_public_pricing(_slug text)
RETURNS TABLE(
  id uuid,
  business_name text,
  slug text,
  tagline text,
  phone text,
  logo_url text,
  currency text,
  allow_photos boolean,
  sedan_base numeric,
  suv_base numeric,
  truck_base numeric,
  addon_pet_hair numeric,
  addon_stains numeric,
  addon_ceramic numeric,
  services jsonb,
  packages jsonb,
  vehicle_categories jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.business_name, p.slug, p.tagline, p.phone, p.logo_url, p.currency, p.allow_photos,
         p.sedan_base, p.suv_base, p.truck_base,
         p.addon_pet_hair, p.addon_stains, p.addon_ceramic,
         p.services, p.packages, p.vehicle_categories
  FROM public.profiles p
  WHERE p.slug = _slug
  LIMIT 1;
$$;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS vehicle_desc text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

DROP POLICY IF EXISTS "Customers can upload quote photos" ON storage.objects;
CREATE POLICY "Customers can upload quote photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'quote-photos');

DROP POLICY IF EXISTS "Detailers view their own quote photos" ON storage.objects;
CREATE POLICY "Detailers view their own quote photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-photos' AND (storage.foldername(name))[1] = auth.uid()::text);