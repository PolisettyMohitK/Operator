import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { listInvoicesForPage } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await listInvoicesForPage();

  return (
    <AppShell
      activeHref="/app/invoices"
      title="Invoices"
      description="Normalized invoice state, follow-up spacing, and channel readiness live in one table regardless of spreadsheet complexity."
    >
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.1fr_repeat(5,minmax(0,1fr))] border-b border-[color:var(--border)] bg-[color:var(--surface-muted)] px-5 py-4 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
          <span>Client</span>
          <span>Invoice</span>
          <span>Due date</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Channel</span>
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 py-12">
            <p className="text-base font-semibold text-[color:var(--foreground)]">
              No invoice rows are stored yet
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
              Set `DATABASE_URL`, run the migrations, and seed the database to
              replace the invoice mock data with live Postgres reads.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid grid-cols-[1.1fr_repeat(5,minmax(0,1fr))] px-5 py-5 text-sm"
              >
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">
                    {invoice.clientName}
                  </p>
                  <p className="mt-1 text-[color:var(--muted-foreground)]">
                    Owner: {invoice.owner}
                  </p>
                </div>
                <span className="text-[color:var(--foreground)]">{invoice.invoiceId}</span>
                <span className="text-[color:var(--foreground)]">{invoice.dueDate}</span>
                <span className="text-[color:var(--foreground)]">
                  ${invoice.amountDue.toLocaleString()}
                </span>
                <span className="text-[color:var(--accent)]">{invoice.status}</span>
                <span className="text-[color:var(--muted-foreground)]">
                  {invoice.channel}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
