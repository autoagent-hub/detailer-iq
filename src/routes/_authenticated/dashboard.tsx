import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  LogOut,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import type { TablesUpdate } from "@/integrations/supabase/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCIES,
  TIMEZONES,
  addonLabel,
  formatWhen,
  money,
  parsePackages,
  parseServices,
  parseVehicleCategories,
  vehicleLabel,
  type ServiceItem,
  type VehicleCategory,
} from "@/lib/pricing";

const TELEGRAM_BOT = "QuoteFlowAlertsBot";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Detailer Dashboard — QuoteFlow" },
      {
        name: "description",
        content:
          "Set your detailing prices, vehicle categories, Telegram alerts and review incoming quote requests.",
      },
      { property: "og:title", content: "Detailer Dashboard — QuoteFlow" },
      {
        property: "og:description",
        content: "Manage pricing, branding, Telegram alerts and quote history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

type Profile = {
  id: string;
  business_name: string;
  slug: string;
  tagline: string;
  phone: string;
  logo_url: string | null;
  currency: string;
  timezone: string;
  notify_telegram: boolean;
  notify_include_photos: boolean;
  notify_include_notes: boolean;
  allow_photos: boolean;
  telegram_chat_id: string | null;
  telegram_auth_code: string;
  services: unknown;
  packages: unknown;
  vehicle_categories: unknown;
  sedan_base: number;
  suv_base: number;
  truck_base: number;
};

type Quote = {
  id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_type: string;
  vehicle_desc: string;
  service_label: string;
  service_price: number;
  addons: string[];
  estimated_price: number;
  notes: string;
  photo_urls: string[];
  currency: string;
  created_at: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["quotes", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-16">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-bold">
            <span className="gradient-primary flex size-7 items-center justify-center rounded-lg text-primary-foreground">
              <Sparkles className="size-3.5" />
            </span>
            QuoteFlow
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-5 py-6">
        {profile ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">{profile.business_name}</h1>
              <PublicLink slug={profile.slug} />
            </div>

            <Tabs defaultValue="requests">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-5">
                <QuoteHistory
                  quotes={quotes ?? []}
                  currency={profile.currency}
                  timezone={profile.timezone}
                  services={parseServices(profile.services)}
                  categories={parseVehicleCategories(profile.vehicle_categories)}
                />
              </TabsContent>

              <TabsContent value="account" className="mt-5 space-y-5">
                <BusinessProfileCard profile={profile} />
              </TabsContent>

              <TabsContent value="pricing" className="mt-5 space-y-5">
                <PricingCard profile={profile} />
              </TabsContent>

              <TabsContent value="alerts" className="mt-5 space-y-5">
                <TelegramCard
                  authCode={profile.telegram_auth_code}
                  chatId={profile.telegram_chat_id}
                />
                <NotificationSettingsCard profile={profile} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Onboarding />
        )}
      </main>
    </div>
  );
}

function PublicLink({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${slug}`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Link2 className="size-4" />
      <span className="font-medium text-foreground">/{slug}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(url);
          toast.success("Quote link copied");
        }}
      >
        <Copy className="size-3.5" /> Copy link
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link to="/$business_slug" params={{ business_slug: slug }}>
          <ExternalLink className="size-3.5" /> Preview
        </Link>
      </Button>
    </div>
  );
}

function useProfileUpdate(onDone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesUpdate<"profiles"> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("profiles").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(onDone);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

function BusinessProfileCard({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    business_name: profile.business_name,
    slug: profile.slug,
    tagline: profile.tagline ?? "",
    phone: profile.phone ?? "",
    logo_url: profile.logo_url ?? "",
    currency: profile.currency,
    timezone: profile.timezone,
  });
  const save = useProfileUpdate("Business profile saved");

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Business profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="business_name">Business name</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Public link</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">/{form.slug || "your-link"}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Business phone</Label>
            <Input
              id="phone"
              value={form.phone}
              inputMode="tel"
              placeholder="+1 555 010 2020"
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={form.logo_url}
              placeholder="https://..."
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Textarea
            id="tagline"
            rows={2}
            value={form.tagline}
            placeholder="Showroom shine, at your driveway."
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time zone</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Time zone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="hero"
          size="lg"
          disabled={save.isPending || !form.business_name.trim() || !form.slug}
          onClick={() =>
            save.mutate({
              id: profile.id,
              business_name: form.business_name.trim(),
              slug: form.slug,
              tagline: form.tagline.trim(),
              phone: form.phone.trim(),
              logo_url: form.logo_url.trim() || null,
              currency: form.currency,
              timezone: form.timezone,
            })
          }
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}

function ItemRows({
  items,
  currency,
  unitLabel,
  onChange,
}: {
  items: ServiceItem[];
  currency: string;
  unitLabel: string;
  onChange: (next: ServiceItem[]) => void;
}) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {items.map((s, i) => (
        <div
          key={s.key}
          className={`flex items-center gap-3 p-3.5 ${s.enabled ? "" : "opacity-55"}`}
        >
          <Switch
            checked={s.enabled}
            aria-label={`Offer ${s.label}`}
            onCheckedChange={(checked) =>
              onChange(items.map((item, idx) => (idx === i ? { ...item, enabled: checked } : item)))
            }
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{s.label}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{s.sub}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{unitLabel}</span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              aria-label={`${s.label} price in ${currency}`}
              className="w-24"
              value={String(s.price)}
              onChange={(e) =>
                onChange(
                  items.map((item, idx) =>
                    idx === i ? { ...item, price: Number(e.target.value) || 0 } : item,
                  ),
                )
              }
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function PricingCard({ profile }: { profile: Profile }) {
  const [packages, setPackages] = useState<ServiceItem[]>(() => parsePackages(profile.packages));
  const [addons, setAddons] = useState<ServiceItem[]>(() => parseServices(profile.services));
  const [categories, setCategories] = useState<VehicleCategory[]>(() =>
    parseVehicleCategories(profile.vehicle_categories),
  );
  const save = useProfileUpdate("Pricing saved");

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Vehicle categories</CardTitle>
          <Badge variant="secondary">
            {categories.filter((c) => c.enabled).length} live
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The uplift is added to the selected service price. Use a negative number to discount.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {categories.map((c, i) => (
              <div
                key={c.key}
                className={`flex items-center gap-3 p-3.5 ${c.enabled ? "" : "opacity-55"}`}
              >
                <Switch
                  checked={c.enabled}
                  aria-label={`Offer ${c.label}`}
                  onCheckedChange={(checked) =>
                    setCategories((prev) =>
                      prev.map((item, idx) => (idx === i ? { ...item, enabled: checked } : item)),
                    )
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {c.sub}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">uplift</span>
                  <Input
                    type="number"
                    step={1}
                    inputMode="numeric"
                    aria-label={`${c.label} uplift`}
                    className="w-24"
                    value={String(c.uplift)}
                    onChange={(e) =>
                      setCategories((prev) =>
                        prev.map((item, idx) =>
                          idx === i ? { ...item, uplift: Number(e.target.value) || 0 } : item,
                        ),
                      )
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Service packages</CardTitle>
          <Badge variant="secondary">{packages.filter((p) => p.enabled).length} live</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The main job the customer books. Prices are in {profile.currency}.
          </p>
          <ItemRows
            items={packages}
            currency={profile.currency}
            unitLabel="price"
            onChange={setPackages}
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Add-ons</CardTitle>
          <Badge variant="secondary">{addons.filter((a) => a.enabled).length} live</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Every common add-on is preloaded. Adjust the rate or switch off anything you don't
            offer.
          </p>
          <ItemRows
            items={addons}
            currency={profile.currency}
            unitLabel="price"
            onChange={setAddons}
          />
        </CardContent>
      </Card>

      <Button
        variant="hero"
        size="lg"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            id: profile.id,
            packages: packages.map((p) => ({ ...p, price: Number(p.price) || 0 })),
            services: addons.map((a) => ({ ...a, price: Number(a.price) || 0 })),
            vehicle_categories: categories.map((c) => ({ ...c, uplift: Number(c.uplift) || 0 })),
            addon_pet_hair: Number(addons.find((a) => a.key === "pet_hair")?.price) || 0,
            addon_stains: Number(addons.find((a) => a.key === "stains")?.price) || 0,
            addon_ceramic: Number(addons.find((a) => a.key === "ceramic")?.price) || 0,
            sedan_base: Number(packages.find((p) => p.key === "full_detail")?.price) || 0,
            suv_base:
              (Number(packages.find((p) => p.key === "full_detail")?.price) || 0) +
              (Number(categories.find((c) => c.key === "suv")?.uplift) || 0),
            truck_base:
              (Number(packages.find((p) => p.key === "full_detail")?.price) || 0) +
              (Number(categories.find((c) => c.key === "truck")?.uplift) || 0),
          })
        }
      >
        {save.isPending && <Loader2 className="size-4 animate-spin" />}
        Save pricing
      </Button>
    </>
  );
}

function NotificationSettingsCard({ profile }: { profile: Profile }) {
  const [settings, setSettings] = useState({
    notify_telegram: profile.notify_telegram,
    notify_include_photos: profile.notify_include_photos,
    notify_include_notes: profile.notify_include_notes,
    allow_photos: profile.allow_photos,
  });
  const save = useProfileUpdate("Notification settings saved");

  const rows: { key: keyof typeof settings; label: string; sub: string }[] = [
    {
      key: "notify_telegram",
      label: "Telegram alerts",
      sub: "Push every new request to your chat instantly",
    },
    {
      key: "notify_include_photos",
      label: "Include photos in alerts",
      sub: "Send customer photos along with the alert",
    },
    {
      key: "notify_include_notes",
      label: "Include notes in alerts",
      sub: "Send the customer's extra details",
    },
    {
      key: "allow_photos",
      label: "Allow photo uploads",
      sub: "Let customers attach up to 5 photos on your form",
    },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Notification settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 p-3.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.sub}</span>
              </span>
              <Switch
                checked={settings[r.key]}
                aria-label={r.label}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, [r.key]: checked }))}
              />
            </div>
          ))}
        </div>
        <Button
          variant="hero"
          size="lg"
          disabled={save.isPending}
          onClick={() => save.mutate({ id: profile.id, ...settings })}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  );
}

function TelegramCard({ authCode, chatId }: { authCode: string; chatId: string | null }) {
  const connected = !!chatId;
  return (
    <Card className="shadow-card">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Telegram alerts</CardTitle>
        <Badge variant={connected ? "default" : "secondary"}>
          {connected ? (
            <>
              <Check className="size-3" /> Connected
            </>
          ) : (
            "Not Connected"
          )}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {connected
            ? "Every new quote request is pushed to your Telegram chat in real time."
            : "Tap below and press Start in Telegram. Your unique code links the bot to this account."}
        </p>
        <Button asChild variant={connected ? "outline" : "hero"} size="xl">
          <a
            href={`https://t.me/${TELEGRAM_BOT}?start=${authCode}`}
            target="_blank"
            rel="noreferrer"
          >
            <Send className="size-4" />
            {connected ? "Reconnect Telegram Bot" : "Connect Telegram Bot"}
          </a>
        </Button>
        <p className="font-mono text-xs text-muted-foreground">Auth code: {authCode}</p>
      </CardContent>
    </Card>
  );
}

function PhotoDialog({
  paths,
  customer,
}: {
  paths: string[];
  customer: string;
}) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setOpen(true);
    if (urls.length || loading) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("quote-photos")
      .createSignedUrls(paths, 60 * 60);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setUrls(
      (data ?? [])
        .map((d) => d.signedUrl)
        .filter((u): u is string => !!u),
    );
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void load()}>
        <ImageIcon className="size-3.5" /> {paths.length}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photos from {customer}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {urls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer">
                  <img
                    src={u}
                    alt={`Vehicle photo from ${customer}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuoteHistory({
  quotes,
  currency,
  timezone,
  services,
  categories,
}: {
  quotes: Quote[];
  currency: string;
  timezone: string;
  services: ServiceItem[];
  categories: VehicleCategory[];
}) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Quote requests</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {quotes.length === 0 ? (
          <p className="px-6 pb-2 text-sm text-muted-foreground sm:px-0">
            No requests yet. Share your quote link to start collecting leads.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Add-ons</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.customer_name}</TableCell>
                    <TableCell>
                      <a href={`tel:${q.customer_phone}`} className="text-primary hover:underline">
                        {q.customer_phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block font-medium">
                        {q.vehicle_desc || vehicleLabel(q.vehicle_type, categories)}
                      </span>
                      {q.vehicle_desc && (
                        <span className="text-xs text-muted-foreground">
                          {vehicleLabel(q.vehicle_type, categories)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.service_label || "—"}
                      {q.service_price ? (
                        <span className="block text-xs text-muted-foreground">
                          {money(Number(q.service_price), q.currency || currency)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.addons.length
                        ? q.addons.map((a) => addonLabel(a, services)).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[16rem] text-xs whitespace-pre-wrap text-muted-foreground">
                      {q.notes?.trim() ? q.notes : "—"}
                    </TableCell>
                    <TableCell>
                      {q.photo_urls?.length ? (
                        <PhotoDialog paths={q.photo_urls} customer={q.customer_name} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {money(Number(q.estimated_price), q.currency || currency)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatWhen(q.created_at, timezone)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Onboarding() {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const finalSlug = slugify(slug || businessName);
      if (!finalSlug) throw new Error("Pick a link for your quote form");
      const { error } = await supabase.from("profiles").insert({
        id: uid,
        business_name: businessName.trim(),
        slug: finalSlug,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business created");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="mx-auto max-w-md shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Set up your business</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ob-name">Business name</Label>
          <Input
            id="ob-name"
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            placeholder="Reflect Mobile Detailing"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-slug">Quote link</Label>
          <Input
            id="ob-slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="reflect-mobile-detailing"
          />
          <p className="text-xs text-muted-foreground">
            Customers will visit /{slug || "your-link"}
          </p>
        </div>
        <Button
          variant="hero"
          size="xl"
          disabled={!businessName.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          Create my quote form
        </Button>
      </CardContent>
    </Card>
  );
}
