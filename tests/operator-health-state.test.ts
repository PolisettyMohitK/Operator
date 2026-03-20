import { describe, expect, it } from "vitest";

import {
  buildDeliveryFailureState,
  buildOpenClawRuntimeState,
  buildSyncStalledState,
} from "@/lib/operator/health/status";

describe("workspace health state helpers", () => {
  it("builds a degraded OpenClaw status card", () => {
    expect(
      buildOpenClawRuntimeState({
        lastSuccessfulEventLabel: "Mar 20, 08:45",
        runtimeStatus: "degraded",
      }),
    ).toEqual({
      actionLabel: "Retry runtime or continue reviewing fallback drafts.",
      lastSuccessfulEventLabel: "Mar 20, 08:45",
      state: "degraded",
      subject: "OpenClaw runtime",
      whatHappened: "OpenClaw draft intelligence is unavailable.",
      whatItMeans:
        "Operator is using safe fallback templates, so tailored drafting is reduced.",
    });
  });

  it("builds an attention-needed sync state", () => {
    expect(
      buildSyncStalledState({
        lastSuccessfulEventLabel: "Mar 20, 07:10",
        providerLabel: "Google Sheets",
        state: "attention_needed",
      }),
    ).toEqual({
      actionLabel: "Retry sync or reconnect Google Sheets.",
      lastSuccessfulEventLabel: "Mar 20, 07:10",
      state: "attention_needed",
      subject: "Google Sheets sync",
      whatHappened:
        "Invoice sync has not completed successfully since Mar 20, 07:10.",
      whatItMeans:
        "New or updated overdue invoices may be missing from the queue.",
    });
  });

  it("builds a permanent delivery failure state", () => {
    expect(
      buildDeliveryFailureState({
        approvalItemLabel: "INV-201",
      }),
    ).toEqual({
      actionLabel: "Retry delivery, switch channel, or edit and resend.",
      lastSuccessfulEventLabel: null,
      state: "degraded",
      subject: "Delivery failure",
      whatHappened: "The approved follow-up for INV-201 was not delivered.",
      whatItMeans: "The client has not been contacted.",
    });
  });
});
