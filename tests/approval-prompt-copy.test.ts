import { describe, expect, it } from "vitest";

import { buildApprovalPromptCopy } from "@/lib/operator/delivery/approval-prompts";

describe("buildApprovalPromptCopy", () => {
  it("builds email and WhatsApp approval prompts with the action links", () => {
    const copy = buildApprovalPromptCopy({
      amountDue: 4800,
      approveUrl: "https://operator.example.com/api/approval-links/approve",
      clientName: "Northline Studio",
      draftContent:
        "Hi Elena, invoice INV-201 is overdue and we need payment timing today.",
      invoiceCode: "INV-201",
      queueUrl: "https://operator.example.com/app/queue",
      reason:
        "18 days overdue. Last follow-up was 9 days ago. Client opened the previous email twice.",
      rejectUrl: "https://operator.example.com/api/approval-links/reject",
    });

    expect(copy.emailSubject).toContain("INV-201");
    expect(copy.emailBody).toContain("Northline Studio");
    expect(copy.emailBody).toContain("Approve");
    expect(copy.emailBody).toContain("Reject");
    expect(copy.emailBody).toContain("https://operator.example.com/api/approval-links/approve");
    expect(copy.whatsAppMessage).toContain("INV-201");
    expect(copy.whatsAppMessage).toContain("Approve:");
    expect(copy.whatsAppMessage).toContain("Reject:");
  });
});
