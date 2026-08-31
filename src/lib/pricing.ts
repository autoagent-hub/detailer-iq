export type VehicleType = "sedan" | "suv" | "truck";
export type AddonKey = "pet_hair" | "stains" | "ceramic";

export type Pricing = {
  sedan_base: number;
  suv_base: number;
  truck_base: number;
  addon_pet_hair: number;
  addon_stains: number;
  addon_ceramic: number;
};

export const VEHICLES: { key: VehicleType; label: string; sub: string; priceKey: keyof Pricing }[] = [
  { key: "sedan", label: "Sedan / Coupe", sub: "2–5 seats, standard cabin", priceKey: "sedan_base" },
  { key: "suv", label: "SUV / Crossover", sub: "3rd row, extra carpet", priceKey: "suv_base" },
  { key: "truck", label: "Truck / Van", sub: "Bed, cargo & tall panels", priceKey: "truck_base" },
];

export const ADDONS: { key: AddonKey; label: string; sub: string; priceKey: keyof Pricing }[] = [
  { key: "pet_hair", label: "Pet Hair Removal", sub: "Heavy shedding, embedded fur", priceKey: "addon_pet_hair" },
  { key: "stains", label: "Heavy Stain Removal", sub: "Coffee, mud, kid spills", priceKey: "addon_stains" },
  { key: "ceramic", label: "Ceramic Coating", sub: "9H gloss, 2-year protection", priceKey: "addon_ceramic" },
];

/** (Base Price by Vehicle) + (Sum of Active Add-ons) = Estimated Price */
export function calculateEstimate(
  pricing: Pricing,
  vehicle: VehicleType | null,
  addons: AddonKey[],
): number {
  if (!vehicle) return 0;
  const base = Number(pricing[VEHICLES.find((v) => v.key === vehicle)!.priceKey]) || 0;
  const extras = addons.reduce((sum, key) => {
    const addon = ADDONS.find((a) => a.key === key);
    return sum + (addon ? Number(pricing[addon.priceKey]) || 0 : 0);
  }, 0);
  return base + extras;
}

export function money(value: number): string {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

export function addonLabel(key: string): string {
  return ADDONS.find((a) => a.key === key)?.label ?? key;
}

export function vehicleLabel(key: string): string {
  return VEHICLES.find((v) => v.key === key)?.label ?? key;
}
