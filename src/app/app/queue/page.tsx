import { AppShell } from "@/components/app/app-shell";
import { QueueTable } from "@/components/app/queue-table";

export default function QueuePage() {
  return (
    <AppShell
      activeHref="/app/queue"
      title="Approval Queue"
      description="Every pending or edited follow-up stays visible here with rationale, amount at risk, and synchronized channel state."
    >
      <QueueTable />
    </AppShell>
  );
}
