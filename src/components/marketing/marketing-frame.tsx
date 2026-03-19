import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

type MarketingFrameProps = Readonly<{
  children: ReactNode;
}>;

export function MarketingFrame({ children }: MarketingFrameProps) {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
