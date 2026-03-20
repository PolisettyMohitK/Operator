import Link from "next/link";

import { joinAlphaReasons } from "@/lib/operator/site-content";
import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function JoinAlphaPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="eyebrow">Start trial</p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--foreground)] md:text-6xl">
            Start the invoice recovery setup instead of waiting in an alpha queue.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[color:var(--muted-foreground)]">
            Paid V1 is built for owners and small teams who still chase overdue
            revenue by hand and want one disciplined operating system for Gmail,
            Google Sheets, approvals, and delivery visibility.
          </p>
          <div className="mt-10 grid gap-4">
            {joinAlphaReasons.map((reason) => (
              <Card key={reason.title} className="flex gap-4 p-5">
                <div className="rounded-full bg-[color:rgba(24,59,78,0.08)] p-3 text-[color:var(--accent)]">
                  <reason.icon className="size-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
                    {reason.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {reason.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <p className="eyebrow">Start setup</p>
          <h2 className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
            The setup path for paid V1 is explicit
          </h2>
          <div className="mt-6 grid gap-4">
            {[
              "Create your Operator account.",
              "Set up the draft workspace and owner membership.",
              "Connect Gmail and Google Sheets.",
              "Complete invoice mapping and trial activation.",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  Step 0{index + 1}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--foreground)]">
                  {step}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            <Button asChild className="w-full">
              <Link href="/sign-up">Create account</Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/app/onboarding">Open self-serve onboarding</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
            The launch path now pushes directly into signup, onboarding, and
            paid workspace activation.
          </p>
        </Card>
      </section>
    </MarketingFrame>
  );
}
