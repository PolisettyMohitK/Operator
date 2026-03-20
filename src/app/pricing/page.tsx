import { CheckCircle2 } from "lucide-react";

import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Card } from "@/components/ui/card";
import { pricingCards } from "@/lib/operator/site-content";

export default function PricingPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-3 max-w-4xl font-serif text-5xl text-[color:var(--foreground)] md:text-6xl">
          One trial, one paid plan, one invoice recovery product.
        </h1>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
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
              <ul className="mt-6 space-y-3">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                    <span className="text-sm leading-6 text-[color:var(--foreground)]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </MarketingFrame>
  );
}
