import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { HeroConsolePreview } from "@/components/marketing/hero-console-preview";
import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  featureCallouts,
  howItWorksSteps,
  marketingPrinciples,
  pricingCards,
  securityHighlights,
} from "@/lib/operator/site-content";

export default function Home() {
  return (
    <MarketingFrame>
      <section className="ambient-grid overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:py-24">
          <div className="section-fade space-y-8">
            <Badge className="bg-[color:rgba(24,59,78,0.08)] text-[color:var(--accent)]">
              Paid invoice recovery
            </Badge>
            <div className="space-y-5">
              <h1 className="headline-balance max-w-3xl font-serif text-5xl leading-[0.94] text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
                Stop running after overdue invoices. Run the room instead.
              </h1>
              <p className="body-balance max-w-2xl text-lg leading-8 text-[color:var(--muted-foreground)]">
                Operator is an AI operations system for small businesses that
                identifies overdue cash, prepares follow-up drafts, routes them
                for approval, and keeps every action visible across the web app
                and Gmail.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/join-alpha">
                  Start Trial <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/app" prefetch={false}>
                  See the Console
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {marketingPrinciples.slice(0, 3).map((principle) => (
                <Card key={principle.title} className="p-4">
                  <principle.icon className="size-5 text-[color:var(--accent)]" />
                  <h2 className="mt-4 text-base font-semibold text-[color:var(--foreground)]">
                    {principle.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {principle.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
          <div className="section-fade-delay">
            <HeroConsolePreview />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-4">
          {marketingPrinciples.map((principle) => (
            <Card key={principle.title} className="p-5">
              <principle.icon className="size-5 text-[color:var(--accent)]" />
              <h3 className="mt-5 text-xl font-semibold text-[color:var(--foreground)]">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {principle.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        <div className="rounded-[36px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-serif text-4xl text-[color:var(--foreground)] md:text-5xl">
              Three steps between a spreadsheet and real operational follow-up
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {howItWorksSteps.map((step) => (
              <Card key={step.step} className="p-6">
                <p className="eyebrow">{step.step}</p>
                <h3 className="mt-4 text-2xl font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-16 md:px-8 lg:grid-cols-3">
        {featureCallouts.map((callout) => (
          <Card key={callout.title} className="p-6">
            <p className="eyebrow">{callout.eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">
              {callout.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {callout.description}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--foreground)]">
              {callout.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6 md:p-8">
          <p className="eyebrow">Security posture</p>
          <h2 className="mt-3 font-serif text-4xl text-[color:var(--foreground)]">
            Approvals first. Audit trails always.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Operator is designed to act like a disciplined operator, not a loose
            chatbot with side effects. The AI layer proposes. The product layer
            enforces roles, context, and accountability.
          </p>
          <ul className="mt-8 space-y-4">
            {securityHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
                <span className="text-sm leading-7 text-[color:var(--foreground)]">
                  {highlight}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          {pricingCards.map((card) => (
            <Card key={card.name} className="p-6">
              <p className="eyebrow">{card.note}</p>
              <h2 className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {card.name}
              </h2>
              <p className="mt-2 font-serif text-5xl text-[color:var(--accent)]">
                {card.price}
              </p>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {card.description}
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--foreground)]">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--accent)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 md:px-8">
        <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(24,59,78,0.98),rgba(15,42,54,0.96))] p-8 text-[color:var(--accent-foreground)] md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="eyebrow text-white/60">Join the first operator circle</p>
              <h2 className="mt-3 max-w-3xl font-serif text-5xl text-white">
                Start the paid version that turns overdue cash recovery into a
                disciplined operating loop.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72">
                Operator is for real small businesses, not generic AI sightseeing.
                If overdue cash matters to your business, the setup path should
                lead straight into a serious product surface.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-[color:var(--surface-elevated)] text-[color:var(--accent)] hover:bg-[color:var(--surface)]"
            >
              <Link href="/join-alpha">Start setup</Link>
            </Button>
          </div>
        </Card>
      </section>
    </MarketingFrame>
  );
}
