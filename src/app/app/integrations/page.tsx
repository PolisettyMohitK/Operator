import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { listToolConnections } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const viewerContext = await requireViewerContext();
  const integrations = await listToolConnections(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/integrations"
      title="Integrations"
      description="The first alpha stays intentionally narrow: Gmail, Google Sheets, WhatsApp, and the constrained OpenClaw worker boundary."
    >
      {integrations.length === 0 ? (
        <Card className="p-6">
          <p className="eyebrow">Integrations</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            No provider connections are stored yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            As Gmail, Google Sheets, WhatsApp, and OpenClaw credentials are saved,
            the workspace connection state will appear here.
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
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
