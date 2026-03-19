import { ArrowRight, Clock3 } from "lucide-react";

import { approveItem, rejectItem } from "@/app/actions/approval";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { QueueDisplayItem } from "@/lib/operator/db/queries";
import { isApprovalFinalized } from "@/lib/operator/db/view-models";
import { approvalItems as mockApprovalItems } from "@/lib/operator/mock-data";

type QueueTableProps = Readonly<{
  items?: QueueDisplayItem[];
  actorId?: string | null;
}>;

export function QueueTable({ items, actorId = null }: QueueTableProps) {
  const queueItems = items ?? mockApprovalItems;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          Approval queue
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">
            Pending and edited drafts
          </h2>
          <Button variant="secondary" size="sm">
            Filter queue
          </Button>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="px-5 py-12">
          <p className="text-base font-semibold text-[color:var(--foreground)]">
            No live approval items yet
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Run the seed script after setting `DATABASE_URL`, then the queue will
            read from Postgres instead of the mock layer.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[color:var(--border)]">
          {queueItems.map((item) => {
            const isLocked = isApprovalFinalized(item.status);

            return (
              <div
                key={item.id}
                className="grid gap-5 px-5 py-5 lg:grid-cols-[1.3fr_0.7fr_0.7fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {item.clientName}
                    </p>
                    <Badge>{item.status}</Badge>
                    <Badge
                      className={
                        item.risk === "urgent"
                          ? "border-[color:rgba(166,90,58,0.24)] bg-[color:rgba(166,90,58,0.08)] text-[color:var(--warn)]"
                          : ""
                      }
                    >
                      {item.risk}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {item.reason}
                  </p>
                  <div className="mt-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm leading-6 text-[color:var(--foreground)]">
                    {item.preview}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-[color:var(--muted-foreground)]">
                  <p className="uppercase tracking-[0.2em]">Invoice</p>
                  <p className="text-base font-semibold text-[color:var(--foreground)]">
                    {item.invoiceId}
                  </p>
                  <p>${item.amountDue.toLocaleString()}</p>
                </div>

                <div className="space-y-2 text-sm text-[color:var(--muted-foreground)]">
                  <p className="uppercase tracking-[0.2em]">Channel</p>
                  <p className="text-base font-semibold text-[color:var(--foreground)]">
                    {item.channelLabel}
                  </p>
                  <div className="inline-flex items-center gap-2">
                    <Clock3 className="size-4" />
                    {isLocked ? "Locked" : "Ready now"}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:items-end">
                  <div className="flex w-full flex-col gap-2 lg:w-auto">
                    {actorId ? (
                      <form action={approveItem.bind(null, item.id, actorId)}>
                        <Button
                          className="w-full lg:w-auto"
                          disabled={isLocked}
                          type="submit"
                        >
                          Approve <ArrowRight className="size-4" />
                        </Button>
                      </form>
                    ) : (
                      <Button className="w-full lg:w-auto" disabled>
                        Approve <ArrowRight className="size-4" />
                      </Button>
                    )}

                    {actorId ? (
                      <form action={rejectItem.bind(null, item.id, actorId)}>
                        <Button
                          className="w-full lg:w-auto"
                          disabled={isLocked}
                          type="submit"
                          variant="secondary"
                        >
                          Reject
                        </Button>
                      </form>
                    ) : (
                      <Button className="w-full lg:w-auto" disabled variant="secondary">
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
