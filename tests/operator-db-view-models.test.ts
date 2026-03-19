import { describe, expect, it } from "vitest";

import {
  formatQueueChannelLabel,
  isApprovalFinalized,
  summarizeInvoiceChannels,
} from "@/lib/operator/db/view-models";

describe("formatQueueChannelLabel", () => {
  it("maps delivery channels to queue-facing labels", () => {
    expect(formatQueueChannelLabel("email")).toBe("Gmail");
    expect(formatQueueChannelLabel("whatsapp")).toBe("WhatsApp");
    expect(formatQueueChannelLabel("web")).toBe("Web");
  });
});

describe("isApprovalFinalized", () => {
  it("keeps pending and edited approvals actionable", () => {
    expect(isApprovalFinalized("pending")).toBe(false);
    expect(isApprovalFinalized("edited")).toBe(false);
  });

  it("locks approvals that have already reached a terminal state", () => {
    expect(isApprovalFinalized("approved")).toBe(true);
    expect(isApprovalFinalized("rejected")).toBe(true);
    expect(isApprovalFinalized("sent")).toBe(true);
    expect(isApprovalFinalized("failed")).toBe(true);
    expect(isApprovalFinalized("stale")).toBe(true);
  });
});

describe("summarizeInvoiceChannels", () => {
  it("collapses channel sets into stable invoice summaries", () => {
    expect(summarizeInvoiceChannels(["email", "web"])).toBe("Email + Web");
    expect(summarizeInvoiceChannels(["whatsapp"])).toBe("WhatsApp");
    expect(summarizeInvoiceChannels(["email", "whatsapp"])).toBe(
      "Email + WhatsApp",
    );
  });

  it("falls back to web when no outbound channels exist yet", () => {
    expect(summarizeInvoiceChannels([])).toBe("Web");
  });
});
