import type { ReactNode } from "react";

import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Card } from "@/components/ui/card";

type AuthFrameProps = Readonly<{
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AuthFrame({
  children,
  eyebrow,
  title,
  description,
}: AuthFrameProps) {
  return (
    <MarketingFrame>
      <section className="mx-auto flex min-h-[78vh] w-full max-w-6xl items-center px-5 py-16 md:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6 md:p-8">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-serif text-5xl text-[color:var(--foreground)]">
              {title}
            </h1>
            <p className="mt-5 text-sm leading-7 text-[color:var(--muted-foreground)]">
              {description}
            </p>
            <div className="mt-8 space-y-4 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  Why this matters
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--foreground)]">
                  Operator keeps approvals, cash at risk, and outbound actions in
                  one controlled surface. Auth is the first enforcement boundary.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  Alpha posture
                </p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--foreground)]">
                  The first release is private by design. Every sign-in is tied
                  to role-aware access, approval rights, and an auditable action
                  trail.
                </p>
              </div>
            </div>
          </Card>

          <Card className="flex items-center p-6 md:p-8">{children}</Card>
        </div>
      </section>
    </MarketingFrame>
  );
}
