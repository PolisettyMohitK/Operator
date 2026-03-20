import Link from "next/link";

import { marketingNavigation } from "@/lib/operator/site-content";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:rgba(246,241,232,0.84)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] text-sm font-semibold tracking-[0.18em] text-[color:var(--accent)]">
            OP
          </span>
          <div className="space-y-0.5">
            <div className="font-serif text-2xl text-[color:var(--foreground)]">
              Operator
            </div>
            <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
              Paid V1
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {marketingNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/join-alpha">Start Trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
