import { ActivityFeed } from "@/components/app/activity-feed";
import { AppShell } from "@/components/app/app-shell";
import { listActivityEvents } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const activityItems = await listActivityEvents();

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
