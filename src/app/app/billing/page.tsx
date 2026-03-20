import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getBillingDisplayState } from "@/lib/operator/db/queries";
import { resolveWorkspaceEntitlements } from "@/lib/operator/billing/entitlements";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const viewerContext = await requireViewerContext();
  const [billingState, entitlements] = await Promise.all([
    getBillingDisplayState(viewerContext.organizationId),
    resolveWorkspaceEntitlements(viewerContext.organizationId),
  ]);

  return (
    <AppShell
      activeHref="/app/billing"
      title="Billing"
      description="Paid V1 keeps billing simple: one invoice recovery workflow, one Google-first setup, and one entitlement model that gates execution server-side."
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Subscription</p>
              <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                {billingState?.plan ?? "No plan yet"}
              </h2>
            </div>
            <Badge>{billingState?.status ?? "Draft"}</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                Trial ends
              </p>
              <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                {billingState?.trialEndsAt ?? "Not started"}
              </p>
            </div>
            <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                Current period
              </p>
              <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                {billingState?.currentPeriodEndsAt ?? "Not active"}
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Stripe checkout and billing automation are the next commercial
            backend slice. The current paid V1 branch already resolves plan and
            entitlement state from Postgres so background execution can be
            blocked safely when billing is inactive.
          </p>
        </Card>

        <Card className="p-6">
          <p className="eyebrow">Entitlements</p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
            Execution stays locked to the paid invoice recovery contract
          </h2>
          <div className="mt-6 grid gap-4">
            {[
              {
                label: "Invoice recovery",
                value: entitlements.invoiceRecoveryEnabled ? "Enabled" : "Disabled",
              },
              {
                label: "Core product access",
                value: entitlements.canAccessCoreProduct ? "Allowed" : "Blocked",
              },
              {
                label: "Background execution",
                value: entitlements.canRunBackgroundExecution ? "Allowed" : "Paused",
              },
              {
                label: "Advanced runtime",
                value: entitlements.advancedRuntimeEnabled ? "Enabled" : "Roadmap flagged",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
              >
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {item.label}
                </p>
                <Badge>{item.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
