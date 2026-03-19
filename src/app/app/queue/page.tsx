import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app/app-shell";
import { QueueTable } from "@/components/app/queue-table";
import {
  listQueueItems,
  resolveActorMembershipId,
} from "@/lib/operator/db/queries";

export default async function QueuePage() {
  const { userId } = await auth();
  const [items, actorId] = await Promise.all([
    listQueueItems(),
    resolveActorMembershipId(userId),
  ]);

  return (
    <AppShell
      activeHref="/app/queue"
      title="Approval Queue"
      description="Every pending or edited follow-up stays visible here with rationale, amount at risk, and synchronized channel state."
    >
      <QueueTable actorId={actorId} items={items} />
    </AppShell>
  );
}
