ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[
 {"key":"pet_hair","label":"Pet Hair Removal","sub":"Heavy shedding, embedded fur","price":40,"enabled":true},
 {"key":"stains","label":"Heavy Stain Removal","sub":"Coffee, mud, kid spills","price":55,"enabled":true},
 {"key":"ceramic","label":"Ceramic Coating","sub":"9H gloss, 2-year protection","price":250,"enabled":true},
 {"key":"interior_shampoo","label":"Interior Shampoo & Extraction","sub":"Deep-clean carpets and seats","price":90,"enabled":true},
 {"key":"leather","label":"Leather Clean & Condition","sub":"Feed and protect leather trim","price":50,"enabled":true},
 {"key":"odor","label":"Odor / Ozone Treatment","sub":"Smoke, pets, spoiled milk","price":75,"enabled":true},
 {"key":"engine_bay","label":"Engine Bay Detail","sub":"Degrease and dress the bay","price":45,"enabled":true},
 {"key":"clay_bar","label":"Clay Bar Decontamination","sub":"Pull embedded paint grit","price":70,"enabled":true},
 {"key":"wax","label":"Wax & Paint Sealant","sub":"3-month gloss protection","price":60,"enabled":true},
 {"key":"paint_correction","label":"Paint Correction (1-Step)","sub":"Machine polish out swirls","price":200,"enabled":false},
 {"key":"headlights","label":"Headlight Restoration","sub":"Clear up yellowed lenses","price":60,"enabled":true},
 {"key":"wheels","label":"Wheel & Wheel-Well Deep Clean","sub":"Iron fallout and brake dust","price":45,"enabled":true},
 {"key":"tire_shine","label":"Tire Shine","sub":"Satin non-sling dressing","price":15,"enabled":true},
 {"key":"glass","label":"Glass Polish & Water Repellent","sub":"Streak-free, rain-beading","price":35,"enabled":true},
 {"key":"trim","label":"Plastic Trim Restoration","sub":"Re-black faded exterior trim","price":40,"enabled":true},
 {"key":"bug_tar","label":"Bug & Tar Removal","sub":"Front end and rockers","price":30,"enabled":true},
 {"key":"undercarriage","label":"Undercarriage / Salt Wash","sub":"Winter road salt flush","price":30,"enabled":false},
 {"key":"headliner","label":"Headliner Spot Clean","sub":"Careful low-moisture clean","price":45,"enabled":false}
]'::jsonb;

UPDATE public.profiles p
SET services = (
  SELECT jsonb_agg(
    CASE
      WHEN item->>'key' = 'pet_hair' THEN jsonb_set(item, '{price}', to_jsonb(p.addon_pet_hair))
      WHEN item->>'key' = 'stains' THEN jsonb_set(item, '{price}', to_jsonb(p.addon_stains))
      WHEN item->>'key' = 'ceramic' THEN jsonb_set(item, '{price}', to_jsonb(p.addon_ceramic))
      ELSE item
    END
  )
  FROM jsonb_array_elements(p.services) AS item
);

DROP FUNCTION IF EXISTS public.get_public_pricing(text);

CREATE FUNCTION public.get_public_pricing(_slug text)
RETURNS TABLE (
  id uuid,
  business_name text,
  slug text,
  sedan_base numeric,
  suv_base numeric,
  truck_base numeric,
  addon_pet_hair numeric,
  addon_stains numeric,
  addon_ceramic numeric,
  services jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.business_name, p.slug, p.sedan_base, p.suv_base, p.truck_base,
         p.addon_pet_hair, p.addon_stains, p.addon_ceramic, p.services
  FROM public.profiles p
  WHERE p.slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pricing(text) TO anon, authenticated;