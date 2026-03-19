import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";

type StatCardProps = Readonly<{
  label: string;
  value: string;
  detail: string;
  trend: string;
}>;

export function StatCard({ label, value, detail, trend }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold text-[color:var(--foreground)]">
            {value}
          </p>
        </div>
        <div className="rounded-full bg-[color:rgba(24,59,78,0.08)] p-2 text-[color:var(--accent)]">
          <ArrowUpRight className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{detail}</p>
      <p className="mt-6 text-sm font-medium text-[color:var(--accent)]">{trend}</p>
    </Card>
  );
}
