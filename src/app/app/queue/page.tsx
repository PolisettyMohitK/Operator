import { AppShell } from "@/components/app/app-shell";
import { QueueTable } from "@/components/app/queue-table";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { listQueueItems } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const viewerContext = await requireViewerContext();
  const items = await listQueueItems(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/queue"
      title="Approval Queue"
      description="Every pending or edited follow-up stays visible here with rationale, amount at risk, and synchronized channel state."
    >
      <QueueTable canApprove={viewerContext.canApprove} items={items} />
    </AppShell>
  );
}
