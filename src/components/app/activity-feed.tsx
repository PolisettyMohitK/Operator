import { Card } from "@/components/ui/card";
import type { ActivityFeedItem } from "@/lib/operator/db/queries";

type ActivityFeedProps = Readonly<{
  items: ActivityFeedItem[];
}>;

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            Activity log
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            Recent operational events
          </h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
          <p className="text-base font-semibold text-[color:var(--foreground)]">
            No activity has been recorded yet
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
            As approvals, retries, and sends happen, the operator trail will
            appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((event) => (
            <div
              key={event.id}
              className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold text-[color:var(--foreground)]">
                  {event.title}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {event.timestamp} · {event.channel}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {event.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
