import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Car, Check, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES, composePhone, defaultCountryForCurrency } from "@/lib/countries";
import { sendQuoteAlert } from "@/lib/telegram.functions";

import {
  calculateQuote,
  money,
  parsePackages,
  parseServices,
  parseVehicleCategories,
  type ServiceItem,
} from "@/lib/pricing";

export const Route = createFileRoute("/$business_slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Get an instant detailing quote — QuoteFlow` },
      {
        name: "description",
        content: `Pick your vehicle and service to get an instant detailing price estimate from ${params.business_slug.replace(/-/g, " ")}.`,
      },
      { property: "og:title", content: "Get an instant detailing quote" },
      {
        property: "og:description",
        content: "Choose your vehicle, service and add-ons and see your price instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuoteForm,
});

type PublicProfile = {
  id: string;
  business_name: string;
  slug: string;
  tagline: string | null;
  phone: string | null;
  logo_url: string | null;
  currency: string | null;
  allow_photos: boolean | null;
  services: unknown;
  packages: unknown;
  vehicle_categories: unknown;
};

const MAX_PHOTOS = 5;

function QuoteForm() {
  const { business_slug } = Route.useParams();
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [vehicleDesc, setVehicleDesc] = useState("");
  const [packageKey, setPackageKey] = useState<string | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-pricing", business_slug],
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase.rpc("get_public_pricing", { _slug: business_slug });
      if (error) throw error;
      return (data?.[0] as PublicProfile | undefined) ?? null;
    },
  });

  const currency = profile?.currency || "USD";
  const categories = useMemo(
    () => parseVehicleCategories(profile?.vehicle_categories).filter((c) => c.enabled),
    [profile],
  );
  const packages = useMemo(
    () => parsePackages(profile?.packages).filter((p) => p.enabled),
    [profile],
  );
  const addonList = useMemo(
    () => parseServices(profile?.services).filter((s) => s.enabled),
    [profile],
  );

  const quote = useMemo(
    () =>
      calculateQuote({
        categories: parseVehicleCategories(profile?.vehicle_categories),
        packages: parsePackages(profile?.packages),
        addons: addonList,
        categoryKey,
        packageKey,
        selectedAddons: addons,
      }),
    [profile, addonList, categoryKey, packageKey, addons],
  );

  const chosenPackage: ServiceItem | undefined = packages.find((p) => p.key === packageKey);
  const chosenCategory = categories.find((c) => c.key === categoryKey);

  const toggleAddon = (key: string) =>
    setAddons((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, MAX_PHOTOS);
    setPhotos(next);
  };

  const uploadPhotos = async (detailerId: string): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${detailerId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("quote-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (!error) paths.push(path);
    }
    return paths;
  };

  const ready = !!categoryKey && !!packageKey && !!name.trim() && !!phone.trim();

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!profile || !ready || !chosenPackage) return;
    setSubmitting(true);
    try {
      const photoPaths = photos.length ? await uploadPhotos(profile.id) : [];

      const { error } = await supabase.from("quotes").insert({
        detailer_id: profile.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        vehicle_type: categoryKey!,
        vehicle_desc: vehicleDesc.trim(),
        service_key: chosenPackage.key,
        service_label: chosenPackage.label,
        service_price: quote.servicePrice,
        addons,
        notes: notes.trim(),
        photo_urls: photoPaths,
        currency,
        estimated_price: quote.total,
      });
      if (error) throw error;

      void sendQuoteAlert({
        data: {
          detailerId: profile.id,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          vehicle: vehicleDesc.trim()
            ? `${vehicleDesc.trim()} (${chosenCategory?.label ?? ""})`
            : (chosenCategory?.label ?? ""),
          service: { label: chosenPackage.label, price: quote.servicePrice },
          addons: addons.map((key) => {
            const found = addonList.find((a) => a.key === key);
            return { label: found?.label ?? key, price: Number(found?.price) || 0 };
          }),
          estimate: quote.total,
          notes: notes.trim(),
          photoPaths,
        },
      }).catch(() => undefined);

      toast.success("Request sent! They'll reach out shortly.");
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
        <Car className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-bold">Quote form not found</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          No detailer uses the link <span className="font-medium">/{business_slug}</span> yet.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/">Back to QuoteFlow</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
        <span className="gradient-primary flex size-14 items-center justify-center rounded-2xl text-primary-foreground shadow-lift">
          <CheckCircle2 className="size-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">Request sent</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {profile.business_name} just got an alert with your details and will text or call {phone}{" "}
          shortly.
        </p>
        <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-5 text-left shadow-card">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Your estimate
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{money(quote.total, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {chosenPackage?.label}
            {addons.length ? ` + ${addons.length} add-on${addons.length === 1 ? "" : "s"}` : ""} ·
            final price confirmed on inspection.
          </p>
        </div>
        {profile.phone ? (
          <Button asChild variant="outline" className="mt-5">
            <a href={`tel:${profile.phone}`}>Call {profile.business_name}</a>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="border-b border-border bg-background px-5 py-5">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={`${profile.business_name} logo`}
              className="size-12 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="gradient-primary flex size-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{profile.business_name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {profile.tagline || "Instant detailing quote — takes 30 seconds."}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-md space-y-7 px-5 py-6">
        <section>
          <StepLabel step={1} title="Your vehicle" />
          <div className="mt-3 space-y-2.5">
            {categories.map((c) => {
              const active = categoryKey === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryKey(c.key)}
                  aria-pressed={active}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-accent shadow-card"
                      : "border-border bg-card hover:border-input"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{c.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{c.sub}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {c.uplift !== 0 && (
                      <span className="font-display text-sm font-bold text-muted-foreground">
                        {c.uplift > 0 ? "+" : "−"}
                        {money(Math.abs(c.uplift), currency)}
                      </span>
                    )}
                    {active && <Check className="size-4 text-primary" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="vehicle_desc">Year, make & model (optional)</Label>
            <Input
              id="vehicle_desc"
              value={vehicleDesc}
              onChange={(e) => setVehicleDesc(e.target.value)}
              placeholder="2023 Mercedes GLE"
            />
          </div>
        </section>

        <section>
          <StepLabel step={2} title="Service" />
          <div className="mt-3 space-y-2.5">
            {packages.map((p) => {
              const active = packageKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPackageKey(p.key)}
                  aria-pressed={active}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-accent shadow-card"
                      : "border-border bg-card hover:border-input"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{p.sub}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-display text-base font-bold">
                      {money(p.price, currency)}
                    </span>
                    {active && <Check className="size-4 text-primary" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <StepLabel step={3} title="Add-ons" />
          <div className="mt-3 space-y-2.5">
            {addonList.map((a) => {
              const active = addons.includes(a.key);
              return (
                <label
                  key={a.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                    active
                      ? "border-primary bg-accent shadow-card"
                      : "border-border bg-card hover:border-input"
                  }`}
                >
                  <Checkbox checked={active} onCheckedChange={() => toggleAddon(a.key)} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{a.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{a.sub}</span>
                  </span>
                  <span className="font-display text-sm font-bold text-primary">
                    +{money(a.price, currency)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {profile.allow_photos !== false && (
          <section>
            <StepLabel step={4} title="Photos (optional)" />
            <p className="mt-2 text-sm text-muted-foreground">
              Snap the messiest spots so the quote is accurate. Up to {MAX_PHOTOS}.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {photos.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Vehicle photo ${i + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-full bg-foreground/80 text-background"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input bg-card text-muted-foreground hover:border-primary hover:text-primary">
                  <Camera className="size-5" />
                  <span className="text-[11px] font-medium">Add photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                </label>
              )}
            </div>
          </section>
        )}

        <section>
          <StepLabel step={5} title="Your estimate" />
          <div className="gradient-ink mt-3 rounded-xl p-5 text-primary-foreground shadow-card">
            <p className="text-xs tracking-widest uppercase opacity-70">Estimated total</p>
            <p className="mt-1 font-display text-4xl font-bold">{money(quote.total, currency)}</p>
            <div className="mt-3 space-y-1 text-xs opacity-80">
              {chosenPackage ? (
                <p>
                  {chosenPackage.label} ({chosenCategory?.label}) —{" "}
                  {money(quote.servicePrice, currency)}
                </p>
              ) : (
                <p>Pick a vehicle and service to see your price.</p>
              )}
              {addons.map((key) => {
                const a = addonList.find((item) => item.key === key);
                return (
                  <p key={key}>
                    {a?.label ?? key} — {money(Number(a?.price) || 0, currency)}
                  </p>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <StepLabel step={6} title="Where should we reach you?" />
          <div className="mt-3 space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Williams"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[128px] shrink-0" aria-label="Country code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="mr-1">{c.flag}</span>
                        {c.dial}
                        <span className="ml-1 text-muted-foreground">{c.code}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  className="flex-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="555 123 4567"
                  autoComplete="tel-national"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll text or call you at {selectedCountry.dial} {phone.trim() || "…"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dog hair in the back, kids spilled juice on the second row…"
              />
            </div>
          </div>
        </section>
      </form>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="font-display text-lg font-bold">{money(quote.total, currency)}</span>
          </div>
          <Button variant="hero" size="xl" disabled={!ready || submitting} onClick={() => submit()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Request Quote
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepLabel({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
        {step}
      </span>
      <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
    </div>
  );
}
