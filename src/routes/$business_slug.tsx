import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car, Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { sendQuoteAlert } from "@/lib/telegram.functions";
import {
  VEHICLES,
  calculateEstimate,
  money,
  parseServices,
  type Pricing,
  type VehicleType,
} from "@/lib/pricing";

export const Route = createFileRoute("/$business_slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Get an instant detailing quote — QuoteFlow` },
      {
        name: "description",
        content: `Pick your vehicle and condition to get an instant detailing price estimate from ${params.business_slug.replace(/-/g, " ")}.`,
      },
      { property: "og:title", content: "Get an instant detailing quote" },
      {
        property: "og:description",
        content: "Choose your vehicle, add-ons and see your price instantly.",
      },
    ],
  }),
  component: QuoteForm,
});

type PublicProfile = Pricing & {
  id: string;
  business_name: string;
  slug: string;
  services: unknown;
};

function QuoteForm() {
  const { business_slug } = Route.useParams();
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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

  const services = useMemo(
    () => parseServices(profile?.services).filter((s) => s.enabled),
    [profile],
  );

  const estimate = useMemo(
    () => (profile ? calculateEstimate(profile, vehicle, services, addons) : 0),
    [profile, vehicle, services, addons],
  );

  const toggleAddon = (key: string) =>
    setAddons((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !vehicle) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("quotes").insert({
        detailer_id: profile.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        vehicle_type: vehicle,
        addons,
        estimated_price: estimate,
      });
      if (error) throw error;

      void sendQuoteAlert({
        data: {
          detailerId: profile.id,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          vehicle: VEHICLES.find((v) => v.key === vehicle)!.label,
          addons: addons.map((a) => services.find((s) => s.key === a)?.label ?? a),
          estimate,
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
          {profile.business_name} just got a Telegram alert with your details and will text or call{" "}
          {phone} shortly.
        </p>
        <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-5 text-left shadow-card">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Your estimate
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{money(estimate)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Final price confirmed on inspection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="border-b border-border bg-background px-5 py-5">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <Sparkles className="size-3.5 text-primary" /> Instant quote
        </span>
        <h1 className="mt-1.5 text-2xl font-bold">{profile.business_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer 4 quick questions to see your price.
        </p>
      </header>

      <form onSubmit={submit} className="mx-auto max-w-md space-y-6 px-5 py-6">
        <section>
          <StepLabel step={1} title="Vehicle size" />
          <div className="mt-3 space-y-2.5">
            {VEHICLES.map((v) => {
              const active = vehicle === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVehicle(v.key)}
                  aria-pressed={active}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-accent shadow-card"
                      : "border-border bg-card hover:border-input"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{v.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{v.sub}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-display text-base font-bold">
                      {money(Number(profile[v.priceKey]))}
                    </span>
                    {active && <Check className="size-4 text-primary" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <StepLabel step={2} title="Vehicle condition & extras" />
          <div className="mt-3 space-y-2.5">
            {services.map((a) => {
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
                    +{money(a.price)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <StepLabel step={3} title="Your estimate" />
          <div className="gradient-ink mt-3 flex items-end justify-between rounded-xl p-5 text-primary-foreground shadow-card">
            <div>
              <p className="text-xs tracking-widest uppercase opacity-70">Estimated total</p>
              <p className="mt-1 font-display text-4xl font-bold">{money(estimate)}</p>
            </div>
            <p className="max-w-[9rem] text-right text-xs opacity-70">
              {vehicle ? "Updates as you toggle options" : "Pick a vehicle size to start"}
            </p>
          </div>
        </section>

        <section>
          <StepLabel step={4} title="Where should we reach you?" />
          <div className="mt-3 space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Miles"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </div>
          </div>
        </section>
      </form>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="font-display text-lg font-bold">{money(estimate)}</span>
          </div>
          <Button
            variant="hero"
            size="xl"
            disabled={!vehicle || !name.trim() || !phone.trim() || submitting}
            onClick={submit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Request Booking
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
