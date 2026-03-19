import { describe, expect, it } from "vitest";

import {
  buildPortfolioSummary,
  type InvoiceRecord,
  type ReminderPolicy,
} from "@/lib/operator/domain/overdue-portfolio";

const invoices: InvoiceRecord[] = [
  {
    invoiceId: "INV-201",
    clientName: "Northline Studio",
    clientEmail: "finance@northline.studio",
    amountDue: 4800,
    dueDate: "2026-03-01",
    status: "open",
    lastFollowUpAt: "2026-03-10",
  },
  {
    invoiceId: "INV-202",
    clientName: "Harbor & Finch",
    clientEmail: "ops@harborfinch.com",
    amountDue: 950,
    dueDate: "2026-03-15",
    status: "open",
  },
  {
    invoiceId: "INV-203",
    clientName: "Aster Lane",
    clientEmail: "billing@asterlane.com",
    amountDue: 300,
    dueDate: "2026-02-26",
    status: "paid",
  },
];

const policy: ReminderPolicy = {
  urgentAfterDays: 14,
  staleAfterDays: 10,
  minimumSpacingDays: 3,
};

describe("buildPortfolioSummary", () => {
  it("identifies overdue cash at risk and approval candidates", () => {
    const summary = buildPortfolioSummary(invoices, new Date("2026-03-19"), policy);

    expect(summary.cashAtRisk).toBe(5750);
    expect(summary.overdueCount).toBe(2);
    expect(summary.candidates.map((candidate) => candidate.invoiceId)).toEqual([
      "INV-201",
      "INV-202",
    ]);
    expect(summary.candidates[0]?.riskLevel).toBe("urgent");
    expect(summary.candidates[1]?.riskLevel).toBe("due-soon");
  });

  it("suppresses a candidate when the minimum spacing window is not met", () => {
    const summary = buildPortfolioSummary(
      [
        {
          invoiceId: "INV-401",
          clientName: "Velvet Pine",
          clientEmail: "ap@velvetpine.com",
          amountDue: 2100,
          dueDate: "2026-03-01",
          status: "open",
          lastFollowUpAt: "2026-03-18",
        },
      ],
      new Date("2026-03-19"),
      policy,
    );

    expect(summary.candidates).toHaveLength(0);
  });
});
