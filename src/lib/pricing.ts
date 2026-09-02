export type ServiceItem = {
  key: string;
  label: string;
  sub: string;
  price: number;
  enabled: boolean;
};

export type VehicleCategory = {
  key: string;
  label: string;
  sub: string;
  uplift: number;
  enabled: boolean;
};

/** Service packages (the main job the customer books). */
export const DEFAULT_PACKAGES: ServiceItem[] = [
  { key: "express_wash", label: "Express Wash & Dry", sub: "Exterior hand wash, wheels, towel dry", price: 60, enabled: true },
  { key: "interior_detail", label: "Interior Detail", sub: "Vacuum, wipe-down, glass, mats", price: 120, enabled: true },
  { key: "exterior_detail", label: "Exterior Detail", sub: "Decon wash, clay, sealant", price: 140, enabled: true },
  { key: "full_detail", label: "Full Detail", sub: "Inside and out, top to bottom", price: 190, enabled: true },
  { key: "showroom", label: "Showroom Package", sub: "Full detail plus 1-step polish", price: 320, enabled: true },
  { key: "maintenance", label: "Maintenance Clean", sub: "For regular monthly clients", price: 85, enabled: false },
];

/** Vehicle categories. `uplift` is added to the chosen service price. */
export const DEFAULT_VEHICLE_CATEGORIES: VehicleCategory[] = [
  { key: "sedan", label: "Sedan / Coupe", sub: "2-5 seats, standard cabin", uplift: 0, enabled: true },
  { key: "suv", label: "SUV / Crossover", sub: "3rd row, extra carpet", uplift: 35, enabled: true },
  { key: "truck", label: "Truck / Van", sub: "Bed, cargo & tall panels", uplift: 60, enabled: true },
  { key: "motorcycle", label: "Motorcycle / ATV", sub: "Two wheels, exposed trim", uplift: -40, enabled: false },
  { key: "rv", label: "RV / Box Truck", sub: "Oversized, extra hours", uplift: 150, enabled: false },
];

/** Common detailing add-ons every detailer starts with out of the box. */
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

function mergeItems(raw: unknown, defaults: ServiceItem[]): ServiceItem[] {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const byKey = new Map(
    list.filter((i) => typeof i?.["key"] === "string").map((i) => [String(i["key"]), i]),
  );
  const merged = defaults.map((base) => {
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

/** Normalizes the jsonb `services` (add-ons) column into a typed, complete list. */
export function parseServices(raw: unknown): ServiceItem[] {
  return mergeItems(raw, DEFAULT_SERVICES);
}

/** Normalizes the jsonb `packages` column into a typed, complete list. */
export function parsePackages(raw: unknown): ServiceItem[] {
  return mergeItems(raw, DEFAULT_PACKAGES);
}

/** Normalizes the jsonb `vehicle_categories` column into a typed, complete list. */
export function parseVehicleCategories(raw: unknown): VehicleCategory[] {
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const byKey = new Map(
    list.filter((i) => typeof i?.["key"] === "string").map((i) => [String(i["key"]), i]),
  );
  const merged = DEFAULT_VEHICLE_CATEGORIES.map((base) => {
    const found = byKey.get(base.key);
    if (!found) return base;
    byKey.delete(base.key);
    return {
      key: base.key,
      label: typeof found["label"] === "string" ? found["label"] : base.label,
      sub: typeof found["sub"] === "string" ? found["sub"] : base.sub,
      uplift: Number(found["uplift"]) || 0,
      enabled: found["enabled"] !== false,
    };
  });
  const extras: VehicleCategory[] = [...byKey.values()].map((i) => ({
    key: String(i["key"]),
    label: typeof i["label"] === "string" ? i["label"] : String(i["key"]),
    sub: typeof i["sub"] === "string" ? i["sub"] : "",
    uplift: Number(i["uplift"]) || 0,
    enabled: i["enabled"] !== false,
  }));
  return [...merged, ...extras];
}

/** (Service price + vehicle category uplift) + (sum of selected add-ons) = estimate */
export function calculateQuote(args: {
  categories: VehicleCategory[];
  packages: ServiceItem[];
  addons: ServiceItem[];
  categoryKey: string | null;
  packageKey: string | null;
  selectedAddons: string[];
}): { servicePrice: number; uplift: number; addonsTotal: number; total: number } {
  const category = args.categories.find((c) => c.key === args.categoryKey);
  const pack = args.packages.find((p) => p.key === args.packageKey);
  const servicePrice = pack ? Number(pack.price) || 0 : 0;
  const uplift = category ? Number(category.uplift) || 0 : 0;
  const addonsTotal = args.selectedAddons.reduce((sum, key) => {
    const addon = args.addons.find((a) => a.key === key);
    return sum + (addon ? Number(addon.price) || 0 : 0);
  }, 0);
  const total = Math.max(0, servicePrice + uplift + addonsTotal);
  return { servicePrice: servicePrice + uplift, uplift, addonsTotal, total };
}

export const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "ZAR", label: "South African Rand (R)" },
] as const;

export const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Australia/Sydney",
] as const;

export function money(value: number, currency = "USD"): string {
  const amount = Math.round(Number(value) || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString("en-US")}`;
  }
}

export function addonLabel(key: string, services?: ServiceItem[]): string {
  return (services ?? DEFAULT_SERVICES).find((s) => s.key === key)?.label ?? key;
}

export function vehicleLabel(key: string, categories?: VehicleCategory[]): string {
  return (categories ?? DEFAULT_VEHICLE_CATEGORIES).find((v) => v.key === key)?.label ?? key;
}

export function formatWhen(iso: string, timezone?: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: timezone || undefined,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}
