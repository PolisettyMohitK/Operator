import Link from "next/link";

import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center px-5 py-16 md:px-8">
        <Card className="mx-auto w-full max-w-xl p-6 md:p-8">
          <p className="eyebrow">Sign in</p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--foreground)]">
            Operator account access
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Clerk is wired as the auth layer for the real build. When no Clerk
            publishable key is present, this page stays in product-shell mode so
            the app remains explorable locally.
          </p>
          <div className="mt-8 grid gap-4">
            <input
              className="rounded-[18px] border border-[color:var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Owner email"
            />
            <input
              className="rounded-[18px] border border-[color:var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
              placeholder="Password"
              type="password"
            />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="sm:flex-1">Continue</Button>
            <Button asChild variant="secondary" className="sm:flex-1">
              <Link href="/app">Enter preview console</Link>
            </Button>
          </div>
        </Card>
      </section>
    </MarketingFrame>
  );
}
