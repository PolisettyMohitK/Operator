import { describe, expect, it } from "vitest";

import {
  formatActivityTimestamp,
  formatCompactUsdAmount,
  formatMetricCount,
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

describe("formatCompactUsdAmount", () => {
  it("formats larger invoice totals into compact dollar labels", () => {
    expect(formatCompactUsdAmount(28_400)).toBe("$28.4K");
    expect(formatCompactUsdAmount(9_800)).toBe("$9.8K");
  });

  it("keeps smaller totals in standard currency notation", () => {
    expect(formatCompactUsdAmount(950)).toBe("$950");
    expect(formatCompactUsdAmount(0)).toBe("$0");
  });
});

describe("formatMetricCount", () => {
  it("pads single digit counts to preserve the dashboard rhythm", () => {
    expect(formatMetricCount(6)).toBe("06");
  });

  it("keeps double-digit counts untouched", () => {
    expect(formatMetricCount(14)).toBe("14");
  });
});

describe("formatActivityTimestamp", () => {
  it("prefers the stored display label when one exists", () => {
    expect(
      formatActivityTimestamp(new Date("2026-03-19T07:52:00Z"), "07:52"),
    ).toBe("07:52");
  });

  it("falls back to the created-at time when no label is stored", () => {
    expect(formatActivityTimestamp(new Date("2026-03-19T09:14:00Z"))).toBe(
      "09:14",
    );
  });
});
