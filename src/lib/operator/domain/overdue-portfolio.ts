import { differenceInCalendarDays, isAfter, parseISO, startOfDay } from "date-fns";

export type InvoiceRecord = Readonly<{
  invoiceId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amountDue: number;
  dueDate: string;
  status: string;
  lastFollowUpAt?: string;
}>;

export type ReminderPolicy = Readonly<{
  urgentAfterDays: number;
  staleAfterDays: number;
  minimumSpacingDays: number;
}>;

export type ApprovalCandidate = Readonly<{
  invoiceId: string;
  clientName: string;
  amountDue: number;
  dueDate: string;
  daysOverdue: number;
  riskLevel: "urgent" | "due-soon";
}>;

export type PortfolioSummary = Readonly<{
  cashAtRisk: number;
  overdueCount: number;
  candidates: ApprovalCandidate[];
}>;

function isOutstanding(status: string) {
  return status.toLowerCase() !== "paid";
}

export function buildPortfolioSummary(
  invoices: InvoiceRecord[],
  now: Date,
  policy: ReminderPolicy,
): PortfolioSummary {
  const referenceDate = startOfDay(now);

  const overdueInvoices = invoices.filter((invoice) => {
    if (!isOutstanding(invoice.status)) {
      return false;
    }

    return !isAfter(parseISO(invoice.dueDate), referenceDate);
  });

  const candidates = overdueInvoices.flatMap<ApprovalCandidate>((invoice) => {
    const lastFollowUpAt = invoice.lastFollowUpAt
      ? parseISO(invoice.lastFollowUpAt)
      : undefined;

    if (
      lastFollowUpAt &&
      differenceInCalendarDays(referenceDate, startOfDay(lastFollowUpAt)) <
        policy.minimumSpacingDays
    ) {
      return [];
    }

    const daysOverdue = differenceInCalendarDays(
      referenceDate,
      startOfDay(parseISO(invoice.dueDate)),
    );

    return [
      {
        invoiceId: invoice.invoiceId,
        clientName: invoice.clientName,
        amountDue: invoice.amountDue,
        dueDate: invoice.dueDate,
        daysOverdue,
        riskLevel: daysOverdue >= policy.urgentAfterDays ? "urgent" : "due-soon",
      },
    ];
  });

  return {
    cashAtRisk: overdueInvoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
    overdueCount: overdueInvoices.length,
    candidates,
  };
}
