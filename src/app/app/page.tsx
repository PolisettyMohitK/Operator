import { auth } from "@clerk/nextjs/server";

import { ActivityFeed } from "@/components/app/activity-feed";
import { AppShell } from "@/components/app/app-shell";
import { QueueTable } from "@/components/app/queue-table";
import { StatCard } from "@/components/app/stat-card";
import { Card } from "@/components/ui/card";
import {
  listActivityEvents,
  listClientsForPage,
  listDashboardMetrics,
  listQueueItems,
  resolveActorMembershipId,
} from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function AppOverviewPage() {
  const { userId } = await auth();
  const [queueMetrics, queueItems, activityItems, clients, actorId] =
    await Promise.all([
      listDashboardMetrics(),
      listQueueItems(),
      listActivityEvents(3),
      listClientsForPage(3),
      resolveActorMembershipId(userId),
    ]);

  return (
    <AppShell
      activeHref="/app"
      title="Overview"
      description="The Operator control room keeps cash at risk, pending approvals, and recent execution state in one place for owners and delegated approvers."
    >
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {queueMetrics.map((metric) => (
              <StatCard key={metric.label} {...metric} />
            ))}
          </div>
          <QueueTable actorId={actorId} items={queueItems} />
        </div>
        <div className="space-y-5">
          <ActivityFeed items={activityItems} />
          <Card className="p-5">
            <p className="eyebrow">Client pulse</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Accounts that need operator context
            </h2>
            {clients.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
                <p className="text-base font-semibold text-[color:var(--foreground)]">
                  No client context stored yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Once client history is synced into Postgres, Operator will show
                  commercial context here.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-base font-semibold text-[color:var(--foreground)]">
                        {client.name}
                      </p>
                      <p className="text-sm font-medium text-[color:var(--accent)]">
                        {client.balanceFormatted}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                      {client.contact}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
                      {client.lastTouchpoint}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {client.sentiment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
