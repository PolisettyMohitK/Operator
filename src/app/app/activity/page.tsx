import { ActivityFeed } from "@/components/app/activity-feed";
import { AppShell } from "@/components/app/app-shell";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { listActivityEvents } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const viewerContext = await requireViewerContext();
  const activityItems = await listActivityEvents(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/activity"
      title="Activity Log"
      description="A complete operational trail across worker output, approvals, sends, retries, and cross-channel actions."
    >
      <ActivityFeed items={activityItems} />
    </AppShell>
  );
}
