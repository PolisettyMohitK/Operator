import Link from "next/link";
import type { ReactNode } from "react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Activity,
  BellRing,
  Cable,
  CreditCard,
  LayoutDashboard,
  NotebookText,
  Shield,
  Settings2,
  Users,
  WalletCards,
  UserCircle2,
} from "lucide-react";

import { hasClerkPublishableKey } from "@/lib/auth/clerk";
import { getViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getOpsUserIds } from "@/lib/operator/integrations/env";
import { canAccessOpsSurface } from "@/lib/operator/ops/access";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/queue", label: "Approval Queue", icon: BellRing },
  { href: "/app/invoices", label: "Invoices", icon: WalletCards },
  { href: "/app/clients", label: "Clients", icon: NotebookText },
  { href: "/app/activity", label: "Activity Log", icon: Activity },
  { href: "/app/team", label: "Team & Permissions", icon: Users },
  { href: "/app/integrations", label: "Integrations", icon: Cable },
  { href: "/app/settings", label: "Settings", icon: Settings2 },
];

const accountNavigation = [
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/account", label: "Account", icon: UserCircle2 },
];

type AppShellProps = Readonly<{
  children: ReactNode;
  activeHref: string;
  title: string;
  description: string;
}>;

export async function AppShell({
  children,
  activeHref,
  title,
  description,
}: AppShellProps) {
  const showClerkControls = hasClerkPublishableKey(process.env);
  const viewerContext = await getViewerContext();
  const businessName = viewerContext?.businessName ?? "Operator Workspace";
  const showOpsSurface = viewerContext
    ? canAccessOpsSurface({
        viewerRole: viewerContext.role,
        viewerUserId: viewerContext.userId,
        opsUserIds: getOpsUserIds(process.env),
        nodeEnv: process.env.NODE_ENV,
      })
    : false;

  return (
    <div className="min-h-screen bg-[color:var(--surface-muted)]">
      <div className="mx-auto flex w-full max-w-[1600px] gap-5 px-3 py-3 sm:px-5 lg:px-6">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-3 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.55)]">
            <div className="rounded-[28px] bg-[color:var(--accent)] p-5 text-[color:var(--accent-foreground)]">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">
                Workspace
              </p>
              <h2 className="mt-3 font-serif text-3xl">{businessName}</h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Operator keeps overdue cash, approvals, and outbound follow-ups in
                one visible system.
              </p>
            </div>

            <nav className="mt-6 space-y-1">
              {primaryNavigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition",
                       item.href === activeHref
                         ? "bg-[color:rgba(24,59,78,0.08)] text-[color:var(--accent)]"
                         : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--foreground)]",
                     )}
                   >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-[color:var(--border)] pt-6">
              <p className="px-4 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                Workspace
              </p>
              <nav className="mt-3 space-y-1">
                {accountNavigation.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition",
                        item.href === activeHref
                          ? "bg-[color:rgba(24,59,78,0.08)] text-[color:var(--accent)]"
                          : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--foreground)]",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
                {showOpsSurface ? (
                  <Link
                    href="/ops"
                    className={cn(
                      "flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition",
                      activeHref === "/ops"
                        ? "bg-[color:rgba(24,59,78,0.08)] text-[color:var(--accent)]"
                        : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-elevated)] hover:text-[color:var(--foreground)]",
                    )}
                  >
                    <Shield className="size-4" />
                    Ops
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-3 z-30 rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(251,248,242,0.9)] px-5 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.5)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
                  Operator app
                </p>
                <h1 className="mt-2 font-serif text-4xl text-[color:var(--foreground)]">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <ThemeToggle />
                <Link
                  href="/app/onboarding"
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                >
                  View self-serve onboarding
                </Link>
              </div>
              {showClerkControls ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <OrganizationSwitcher
                    afterCreateOrganizationUrl="/app"
                    afterSelectOrganizationUrl="/app"
                    afterSelectPersonalUrl="/app"
                    appearance={{
                      elements: {
                        organizationSwitcherTrigger:
                          "rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] shadow-none",
                      },
                    }}
                  />
                  <UserButton />
                </div>
              ) : null}
            </div>
          </header>

          <main className="py-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
