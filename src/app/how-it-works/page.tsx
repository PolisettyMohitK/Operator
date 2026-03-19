import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Card } from "@/components/ui/card";
import { howItWorksSteps } from "@/lib/operator/site-content";

export default function HowItWorksPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <p className="eyebrow">How it works</p>
        <h1 className="mt-3 max-w-4xl font-serif text-5xl text-[color:var(--foreground)] md:text-6xl">
          A narrow operating loop built to recover cash without adding more admin
          to the owner.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[color:var(--muted-foreground)]">
          Operator takes a connected revenue picture, prepares the next right
          follow-up, and makes approval friction low without hiding what is about
          to happen.
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {howItWorksSteps.map((step) => (
            <Card key={step.step} className="p-6">
              <p className="eyebrow">{step.step}</p>
              <h2 className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">
                {step.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </MarketingFrame>
  );
}
