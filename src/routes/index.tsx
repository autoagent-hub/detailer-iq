import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Zap,
  Send,
  SmartphoneNfc,
  PhoneCall,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/hero-detailer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuoteFlow — Instant Quotes for Mobile Detailers" },
      {
        name: "description",
        content:
          "Never lose a detailing lead while mid-wash. QuoteFlow sends customers an instant price estimate and pings you on Telegram the second a quote lands.",
      },
      { property: "og:title", content: "QuoteFlow — Instant Quotes for Mobile Detailers" },
      {
        property: "og:description",
        content:
          "Instant web quotes, real-time Telegram alerts, zero app installs. $15/month with a 7-day free trial.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Zap,
    title: "Instant Web Quotes",
    body: "Customers pick their vehicle and condition, and see a real price in under 20 seconds.",
  },
  {
    icon: Send,
    title: "Real-Time Telegram Alerts",
    body: "Every request hits your phone instantly with name, number, vehicle and total.",
  },
  {
    icon: SmartphoneNfc,
    title: "Zero App Install Required",
    body: "One link you drop in your bio, DMs or truck decal. Works on any phone browser.",
  },
  {
    icon: PhoneCall,
    title: "1-Tap Call & Text",
    body: "Close the lead from the alert. Tap to call or text the customer back immediately.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="gradient-primary flex size-8 items-center justify-center rounded-lg text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            QuoteFlow
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-12 pb-4 md:grid md:grid-cols-2 md:items-center md:gap-12 md:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Built for mobile auto detailers
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-bold md:text-5xl">
            Never Lose a Detailing Lead While&nbsp;Mid-Wash.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            QuoteFlow turns your pricing into a shareable quote link. Customers get an instant
            estimate, you get a Telegram ping with their number — no missed calls, no back and
            forth.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="hero" size="lg">
              <Link to="/auth">
                Start 7-day free trial <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/$business_slug" params={{ business_slug: "demo-detailing" }}>
                See a live quote form
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card required. Cancel anytime. Set up in 4 minutes.
          </p>
        </div>
        <div className="mt-10 md:mt-0">
          <img
            src={heroImage}
            alt="Mobile auto detailer polishing a dark SUV in a driveway"
            width={1600}
            height={1200}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Everything you need to book the job</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Four pieces. Nothing you have to learn.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.title} className="border-border/70 shadow-card">
              <CardContent className="p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-lg px-5 pb-20">
        <Card className="overflow-hidden border-border/70 shadow-card">
          <div className="gradient-ink px-7 py-8 text-primary-foreground">
            <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
              Simple, flat pricing
            </p>
            <p className="mt-3 font-display text-5xl font-bold">
              $15
              <span className="text-base font-medium opacity-70">/month</span>
            </p>
            <p className="mt-2 text-sm opacity-80">One truck or ten. Same price.</p>
          </div>
          <CardContent className="p-7">
            <ul className="space-y-3 text-sm">
              {[
                "Unlimited quote requests",
                "Real-time Telegram alerts",
                "Custom pricing per vehicle & add-on",
                "Your own branded quote link",
                "Full quote history",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="hero" size="xl" className="mt-7">
              <Link to="/auth">Start 7-Day Free Trial</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} QuoteFlow. Quotes that close while you work.
      </footer>
    </div>
  );
}
