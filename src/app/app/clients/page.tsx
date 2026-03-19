import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { listClientsForPage } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const viewerContext = await requireViewerContext();
  const clients = await listClientsForPage(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/clients"
      title="Clients"
      description="Operator keeps the client relationship context alongside the invoice context so reminders stay commercially sane."
    >
      {clients.length === 0 ? (
        <Card className="p-6">
          <p className="eyebrow">Client timeline</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            No clients in the system yet
          </h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            Seed or sync client records into Postgres to replace this empty state
            with live relationship context.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="p-6">
              <p className="eyebrow">Client timeline</p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {client.name}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                {client.contact}
              </p>
              <p className="mt-6 text-4xl font-semibold text-[color:var(--accent)]">
                {client.balanceFormatted}
              </p>
              <p className="mt-6 text-sm leading-7 text-[color:var(--foreground)]">
                {client.lastTouchpoint}
              </p>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
                {client.sentiment}
              </p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
