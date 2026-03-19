import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { integrations } from "@/lib/operator/mock-data";

export default function IntegrationsPage() {
  return (
    <AppShell
      activeHref="/app/integrations"
      title="Integrations"
      description="The first alpha stays intentionally narrow: Gmail, Google Sheets, WhatsApp, and the constrained OpenClaw worker boundary."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name} className="p-6">
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
    </AppShell>
  );
}
