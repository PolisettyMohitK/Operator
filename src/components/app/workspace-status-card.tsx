import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WorkspaceStatusCard as WorkspaceStatusCardModel } from "@/lib/operator/health/status";
import { cn } from "@/lib/utils";

type WorkspaceStatusCardProps = Readonly<{
  card: WorkspaceStatusCardModel;
}>;

function getBadgeClasses(state: WorkspaceStatusCardModel["state"]) {
  switch (state) {
    case "healthy":
      return "border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200";
    case "attention_needed":
      return "border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200";
    case "paused":
      return "border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
    default:
      return "border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200";
  }
}

export function WorkspaceStatusCard({ card }: WorkspaceStatusCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Workspace status</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            {card.subject}
          </h2>
        </div>
        <Badge className={cn("border", getBadgeClasses(card.state))}>
          {card.state.replace(/_/g, " ")}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-4 text-sm leading-7">
        <div>
          <dt className="font-semibold text-[color:var(--foreground)]">
            What happened
          </dt>
          <dd className="text-[color:var(--muted-foreground)]">{card.whatHappened}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[color:var(--foreground)]">
            What it means
          </dt>
          <dd className="text-[color:var(--muted-foreground)]">{card.whatItMeans}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[color:var(--foreground)]">
            What to do
          </dt>
          <dd className="text-[color:var(--muted-foreground)]">{card.actionLabel}</dd>
        </div>
      </dl>

      {card.lastSuccessfulEventLabel ? (
        <p className="mt-5 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
          Last successful event: {card.lastSuccessfulEventLabel}
        </p>
      ) : null}
    </Card>
  );
}
