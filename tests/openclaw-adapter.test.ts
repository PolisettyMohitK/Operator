import { describe, expect, it, vi } from "vitest";

import { EnvBackedOpenClawAdapter } from "@/lib/operator/adapters/openclaw";

const input = {
  organizationName: "Northline Advisory",
  clientName: "Northline Studio",
  invoiceId: "INV-201",
  amountDue: 4800,
  daysOverdue: 18,
  toneGuidance: "Direct and firm.",
};

describe("EnvBackedOpenClawAdapter", () => {
  it("returns a successful recommendation when the gateway responds with 2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        channel: "email",
        rationale: "Overdue invoice needs a formal reminder.",
        draftContent: "Draft body",
      }),
    });

    const adapter = new EnvBackedOpenClawAdapter(
      {
        apiToken: "secret",
        applyPolicyPath: "/worker/runtime/policy",
        baseUrl: "https://openclaw.example.com",
        draftPath: "/worker/drafts",
        runtimeStatePath: "/worker/runtime/state",
      },
      fetchImpl,
    );

    await expect(adapter.createDraftRecommendation(input)).resolves.toEqual({
      channel: "email",
      draftContent: "Draft body",
      ok: true,
      rationale: "Overdue invoice needs a formal reminder.",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openclaw.example.com/worker/drafts",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("returns a structured fallback error when the gateway is unreachable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("socket hang up"));

    const adapter = new EnvBackedOpenClawAdapter(
      {
        apiToken: "secret",
        applyPolicyPath: "/worker/runtime/policy",
        baseUrl: "https://openclaw.example.com",
        draftPath: "/worker/drafts",
        runtimeStatePath: "/worker/runtime/state",
      },
      fetchImpl,
    );

    await expect(adapter.createDraftRecommendation(input)).resolves.toMatchObject({
      channel: "email",
      ok: false,
      error: {
        code: "gateway_unreachable",
        retryable: true,
      },
    });
  });
});
