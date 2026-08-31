import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { addonLabel, money, vehicleLabel } from "@/lib/pricing";

const TELEGRAM_BOT = "QuoteFlowAlertsBot";

const PRICE_FIELDS = [
  { key: "sedan_base", label: "Sedan Base" },
  { key: "suv_base", label: "SUV Base" },
  { key: "truck_base", label: "Truck Base" },
  { key: "addon_pet_hair", label: "Pet Hair Add-on" },
  { key: "addon_stains", label: "Stain Add-on" },
  { key: "addon_ceramic", label: "Ceramic Add-on" },
] as const;

type PriceKey = (typeof PRICE_FIELDS)[number]["key"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Detailer Dashboard — QuoteFlow" },
      {
        name: "description",
        content: "Set your detailing prices, connect Telegram alerts and review incoming quotes.",
      },
      { property: "og:title", content: "Detailer Dashboard — QuoteFlow" },
      { property: "og:description", content: "Manage pricing, Telegram alerts and quote history." },
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
      return data;
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
        .limit(25);
      if (error) throw error;
      return data;
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
            <PricingCard profile={profile} />
            <TelegramCard
              authCode={profile.telegram_auth_code}
              chatId={profile.telegram_chat_id}
            />
            <QuoteHistory quotes={quotes ?? []} />
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

type Profile = {
  id: string;
  business_name: string;
  slug: string;
  telegram_chat_id: string | null;
  telegram_auth_code: string;
} & Record<PriceKey, number>;

function PricingCard({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(PRICE_FIELDS.map((f) => [f.key, String(profile[f.key])])),
  );
  const [businessName, setBusinessName] = useState(profile.business_name);

  const save = useMutation({
    mutationFn: async () => {
      const patch: Record<string, number | string> = { business_name: businessName.trim() };
      for (const f of PRICE_FIELDS) patch[f.key] = Number(values[f.key]) || 0;
      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pricing saved");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Price configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="business_name">Business name</Label>
          <Input
            id="business_name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRICE_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label} ($)</Label>
              <Input
                id={f.key}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button variant="hero" size="lg" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save pricing
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

type Quote = {
  id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_type: string;
  addons: string[];
  estimated_price: number;
  created_at: string;
};

function QuoteHistory({ quotes }: { quotes: Quote[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Quote history</CardTitle>
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
                  <TableHead>Add-ons</TableHead>
                  <TableHead className="text-right">Price</TableHead>
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
                    <TableCell>{vehicleLabel(q.vehicle_type)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.addons.length ? q.addons.map(addonLabel).join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {money(Number(q.estimated_price))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleString()}
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
