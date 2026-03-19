import { ActivityFeed } from "@/components/app/activity-feed";
import { AppShell } from "@/components/app/app-shell";

export default function ActivityPage() {
  return (
    <AppShell
      activeHref="/app/activity"
      title="Activity Log"
      description="A complete operational trail across worker output, approvals, sends, retries, and cross-channel actions."
    >
      <ActivityFeed />
    </AppShell>
  );
}
