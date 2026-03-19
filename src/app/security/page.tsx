import { CheckCircle2 } from "lucide-react";

import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Card } from "@/components/ui/card";
import { securityHighlights } from "@/lib/operator/site-content";

export default function SecurityPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="eyebrow">Security</p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--foreground)] md:text-6xl">
            Designed to be trusted before it is scaled.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[color:var(--muted-foreground)]">
            Operator&apos;s goal is not raw autonomy. It is reliable business
            execution with visible permissions, explicit approvals, and complete
            action history.
          </p>
        </div>
        <Card className="p-6 md:p-8">
          <ul className="space-y-5">
            {securityHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                <span className="text-sm leading-7 text-[color:var(--foreground)]">
                  {highlight}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </MarketingFrame>
  );
}
