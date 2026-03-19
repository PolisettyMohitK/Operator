import Link from "next/link";

import { marketingNavigation } from "@/lib/operator/site-content";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr] md:px-8">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            Operator
          </p>
          <h2 className="max-w-xl font-serif text-3xl text-[color:var(--foreground)]">
            Premium operational software for owners who are still doing too much
            by hand.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            The first release is intentionally narrow: one workflow, one control
            room, and one standard for approvals and auditability.
          </p>
        </div>

        <div className="grid gap-3 text-sm">
          {marketingNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="text-[color:var(--muted-foreground)] transition hover:text-[color:var(--foreground)]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
