import Link from "next/link";

import { disconnectConnectedAccount } from "@/app/actions/integrations";
import { AppShell } from "@/components/app/app-shell";
import { WorkspaceStatusCard } from "@/components/app/workspace-status-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const isOwner = viewerContext.role === "owner";

  function getConnectHref(provider: "gmail" | "google_sheets") {
    return `/api/oauth/google/start?provider=${provider}&returnTo=${encodeURIComponent("/app/integrations")}`;
  }

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

              {integration.provider !== "openclaw_runtime" ? (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] pt-5">
                  {isOwner ? (
                    integration.isConnected ? (
                      <form
                        action={disconnectConnectedAccount.bind(
                          null,
                          integration.provider,
                        )}
                      >
                        <Button type="submit" variant="secondary">
                          Disconnect
                        </Button>
                      </form>
                    ) : (
                      <Button asChild type="button">
                        <Link href={getConnectHref(integration.provider)}>
                          {integration.status === "Reconnect Required"
                            ? "Reconnect"
                            : "Connect"}
                        </Link>
                      </Button>
                    )
                  ) : (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      Only workspace owners can change Google connections.
                    </p>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
