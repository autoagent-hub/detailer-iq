export type VehicleType = "sedan" | "suv" | "truck";

export type Pricing = {
  sedan_base: number;
  suv_base: number;
  truck_base: number;
};

export type ServiceItem = {
  key: string;
  label: string;
  sub: string;
  price: number;
  enabled: boolean;
};

export const VEHICLES: {
  key: VehicleType;
  label: string;
  sub: string;
  priceKey: keyof Pricing;
}[] = [
  { key: "sedan", label: "Sedan / Coupe", sub: "2–5 seats, standard cabin", priceKey: "sedan_base" },
  { key: "suv", label: "SUV / Crossover", sub: "3rd row, extra carpet", priceKey: "suv_base" },
  { key: "truck", label: "Truck / Van", sub: "Bed, cargo & tall panels", priceKey: "truck_base" },
];

/** Common detailing services every detailer starts with out of the box. */
export const DEFAULT_SERVICES: ServiceItem[] = [
  { key: "pet_hair", label: "Pet Hair Removal", sub: "Heavy shedding, embedded fur", price: 40, enabled: true },
  { key: "stains", label: "Heavy Stain Removal", sub: "Coffee, mud, kid spills", price: 55, enabled: true },
  { key: "ceramic", label: "Ceramic Coating", sub: "9H gloss, 2-year protection", price: 250, enabled: true },
  { key: "interior_shampoo", label: "Interior Shampoo & Extraction", sub: "Deep-clean carpets and seats", price: 90, enabled: true },
  { key: "leather", label: "Leather Clean & Condition", sub: "Feed and protect leather trim", price: 50, enabled: true },
  { key: "odor", label: "Odor / Ozone Treatment", sub: "Smoke, pets, spoiled milk", price: 75, enabled: true },
  { key: "engine_bay", label: "Engine Bay Detail", sub: "Degrease and dress the bay", price: 45, enabled: true },
  { key: "clay_bar", label: "Clay Bar Decontamination", sub: "Pull embedded paint grit", price: 70, enabled: true },
  { key: "wax", label: "Wax & Paint Sealant", sub: "3-month gloss protection", price: 60, enabled: true },
  { key: "paint_correction", label: "Paint Correction (1-Step)", sub: "Machine polish out swirls", price: 200, enabled: false },
  { key: "headlights", label: "Headlight Restoration", sub: "Clear up yellowed lenses", price: 60, enabled: true },
  { key: "wheels", label: "Wheel & Wheel-Well Deep Clean", sub: "Iron fallout and brake dust", price: 45, enabled: true },
  { key: "tire_shine", label: "Tire Shine", sub: "Satin non-sling dressing", price: 15, enabled: true },
  { key: "glass", label: "Glass Polish & Water Repellent", sub: "Streak-free, rain-beading", price: 35, enabled: true },
  { key: "trim", label: "Plastic Trim Restoration", sub: "Re-black faded exterior trim", price: 40, enabled: true },
  { key: "bug_tar", label: "Bug & Tar Removal", sub: "Front end and rockers", price: 30, enabled: true },
  { key: "undercarriage", label: "Undercarriage / Salt Wash", sub: "Winter road salt flush", price: 30, enabled: false },
  { key: "headliner", label: "Headliner Spot Clean", sub: "Careful low-moisture clean", price: 45, enabled: false },
];

/** Normalizes the jsonb `services` column into a typed, complete list. */
export function parseServices(raw: unknown): ServiceItem[] {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const byKey = new Map(list.filter((i) => typeof i?.["key"] === "string").map((i) => [String(i["key"]), i]));
  const merged = DEFAULT_SERVICES.map((base) => {
    const found = byKey.get(base.key);
    if (!found) return base;
    byKey.delete(base.key);
    return {
      key: base.key,
      label: typeof found["label"] === "string" ? found["label"] : base.label,
      sub: typeof found["sub"] === "string" ? found["sub"] : base.sub,
      price: Number(found["price"]) || 0,
      enabled: found["enabled"] !== false,
    };
  });
  const extras: ServiceItem[] = [...byKey.values()].map((i) => ({
    key: String(i["key"]),
    label: typeof i["label"] === "string" ? i["label"] : String(i["key"]),
    sub: typeof i["sub"] === "string" ? i["sub"] : "",
    price: Number(i["price"]) || 0,
    enabled: i["enabled"] !== false,
  }));
  return [...merged, ...extras];
}

/** (Base Price by Vehicle) + (Sum of Active Add-ons) = Estimated Price */
export function calculateEstimate(
  pricing: Pricing,
  vehicle: VehicleType | null,
  services: ServiceItem[],
  selected: string[],
): number {
  if (!vehicle) return 0;
  const base = Number(pricing[VEHICLES.find((v) => v.key === vehicle)!.priceKey]) || 0;
  const extras = selected.reduce((sum, key) => {
    const service = services.find((s) => s.key === key);
    return sum + (service ? Number(service.price) || 0 : 0);
  }, 0);
  return base + extras;
}

export function money(value: number): string {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

export function addonLabel(key: string, services?: ServiceItem[]): string {
  return (services ?? DEFAULT_SERVICES).find((s) => s.key === key)?.label ?? key;
}

export function vehicleLabel(key: string): string {
  return VEHICLES.find((v) => v.key === key)?.label ?? key;
}
