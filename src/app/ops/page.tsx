import { notFound } from "next/navigation";

import { retryDeliveryAttempt, retryInvoiceSync } from "@/app/actions/ops";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getOpsUserIds } from "@/lib/operator/integrations/env";
import { canAccessOpsSurface } from "@/lib/operator/ops/access";
import {
  listOpsDeliveryAttempts,
  listOpsSyncRuns,
  listOpsWorkspaceSummaries,
} from "@/lib/operator/ops/queries";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const viewerContext = await requireViewerContext();
  const canAccess = canAccessOpsSurface({
    viewerUserId: viewerContext.userId,
    viewerRole: viewerContext.role,
    opsUserIds: getOpsUserIds(process.env),
    nodeEnv: process.env.NODE_ENV,
  });

  if (!canAccess) {
    notFound();
  }

  const [workspaces, syncRuns, deliveryAttempts] = await Promise.all([
    listOpsWorkspaceSummaries(),
    listOpsSyncRuns(),
    listOpsDeliveryAttempts(),
  ]);

  return (
    <AppShell
      activeHref="/ops"
      title="Ops"
      description="Internal operations surface for launch control, degraded-state visibility, and manual recovery of invoice sync and outbound delivery."
    >
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <p className="eyebrow">Organizations</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
              Workspace lookup and launch health
            </h2>
            <div className="mt-6 space-y-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.organizationId}
                  className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[color:var(--foreground)]">
                        {workspace.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                        {workspace.organizationId}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{workspace.workspaceStatus}</Badge>
                      <Badge>{workspace.subscriptionStatus}</Badge>
                      <Badge>{workspace.runtimeStatus}</Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Pending approvals",
                        value: String(workspace.pendingApprovalsCount),
                      },
                      {
                        label: "Approved, waiting delivery",
                        value: String(workspace.approvedWaitingDeliveryCount),
                      },
                      {
                        label: "Failed deliveries",
                        value: String(workspace.failedDeliveryCount),
                      },
                      {
                        label: "Kill switch",
                        value: workspace.killSwitchEnabled ? "On" : "Off",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                          {item.label}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        Last customer-visible degraded state
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--muted-foreground)]">
                        {workspace.lastDegradedStateLabel}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                        Connected accounts:{" "}
                        {workspace.connectedAccounts.length > 0
                          ? workspace.connectedAccounts
                              .map(
                                (account) =>
                                  `${account.provider} (${account.status})`,
                              )
                              .join(", ")
                          : "None"}
                      </p>
                    </div>
                    <form action={retryInvoiceSync.bind(null, workspace.organizationId)}>
                      <Button variant="secondary">Retry invoice sync</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="eyebrow">Launch contract</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
              Paid V1 is invoice recovery only
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-[color:var(--foreground)]">
              <li>Google-first setup only: Gmail and Google Sheets.</li>
              <li>Gmail is the only live outbound delivery channel.</li>
              <li>OpenClaw stays behind managed Operator settings and audit trails.</li>
              <li>Inbox triage, scheduling, weekly reporting, and WhatsApp are out of scope for launch.</li>
            </ul>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-6">
            <p className="eyebrow">Sync runs</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Recent sync history
            </h2>
            <div className="mt-5 space-y-3">
              {syncRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      {run.businessName}
                    </p>
                    <Badge>{run.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted-foreground)]">
                    {run.detail}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                    Started {run.startedAt}
                    {run.finishedAt ? ` | Finished ${run.finishedAt}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="eyebrow">Delivery attempts</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Recent outbound history
            </h2>
            <div className="mt-5 space-y-3">
              {deliveryAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        {attempt.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                        {attempt.invoiceCode} | {attempt.clientName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{attempt.channel}</Badge>
                      <Badge>{attempt.state}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                      Logged {attempt.createdAt}
                    </p>
                    {attempt.state === "Failed" || attempt.state === "Paused" ? (
                      <form action={retryDeliveryAttempt.bind(null, attempt.id)}>
                        <Button variant="secondary" size="sm">
                          Retry delivery
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
