import { AppShell } from "@/components/app/app-shell";
import { WorkspaceStatusCard } from "@/components/app/workspace-status-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import {
  getWorkspaceHealthCards,
  listToolConnections,
} from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const viewerContext = await requireViewerContext();
  const [integrations, healthCards] = await Promise.all([
    listToolConnections(viewerContext.organizationId),
    getWorkspaceHealthCards(viewerContext.organizationId),
  ]);

  return (
    <AppShell
      activeHref="/app/integrations"
      title="Integrations"
      description="Paid V1 stays intentionally narrow: Gmail, Google Sheets, and the managed OpenClaw runtime that powers invoice recovery without exposing raw agent infrastructure."
    >
      <div className="space-y-5">
        {healthCards.length > 0 ? (
          <div className="grid gap-4">
            {healthCards.map((card) => (
              <WorkspaceStatusCard
                key={`${card.subject}-${card.state}`}
                card={card}
              />
            ))}
          </div>
        ) : null}

      {integrations.length === 0 ? (
        <Card className="p-6">
          <p className="eyebrow">Integrations</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            No provider connections are stored yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Connect Gmail and Google Sheets to activate invoice monitoring,
            draft preparation, and outbound follow-up delivery.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.id} className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-semibold text-[color:var(--foreground)]">
                  {integration.name}
                </p>
                <Badge>{integration.status}</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {integration.detail}
              </p>
              <p className="mt-5 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                State: {integration.state.replace(/_/g, " ")}
              </p>
              {integration.lastSuccessfulEventLabel ? (
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Last successful event: {integration.lastSuccessfulEventLabel}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      </div>
    </AppShell>
  );
}
