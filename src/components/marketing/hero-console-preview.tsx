import { ArrowRight, MailCheck, ShieldCheck, WalletCards } from "lucide-react";

import { approvalItems, queueMetrics } from "@/lib/operator/mock-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function HeroConsolePreview() {
  return (
    <Card className="relative overflow-hidden bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] p-5 sm:p-7">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(24,59,78,0.12),transparent_72%)]" />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
              Operator console
            </p>
            <h3 className="mt-2 font-serif text-3xl text-[color:var(--foreground)]">
              Cash recovery control room
            </h3>
          </div>
          <Badge className="bg-[color:rgba(166,90,58,0.08)] text-[color:var(--accent)]">
            Approvals live
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {queueMetrics.slice(0, 4).map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {metric.value}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  Pending queue
                </p>
                <h4 className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">
                  Priority approvals
                </h4>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(24,59,78,0.07)] px-3 py-1 text-xs font-medium text-[color:var(--accent)]">
                Review now <ArrowRight className="size-3.5" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {approvalItems.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--foreground)]">
                        {item.clientName}
                      </p>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {item.invoiceId} · ${item.amountDue.toLocaleString()}
                      </p>
                    </div>
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
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(24,59,78,0.95)] p-5 text-[color:var(--accent-foreground)]">
              <div className="flex items-center gap-3">
                <WalletCards className="size-4" />
                <span className="text-xs uppercase tracking-[0.24em] text-white/70">
                  Decision principle
                </span>
              </div>
              <p className="mt-4 text-lg leading-7">
                Operator drafts, explains, and synchronizes. A human still owns
                the send.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <ShieldCheck className="size-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">
                    Approval trace
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Every approval path is signed and logged across web, email, and
                  WhatsApp.
                </p>
              </div>
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4">
                <div className="flex items-center gap-2 text-[color:var(--accent)]">
                  <MailCheck className="size-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">
                    Channel sync
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Email and WhatsApp stay in lockstep with the canonical queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
