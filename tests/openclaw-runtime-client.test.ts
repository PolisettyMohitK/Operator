import { describe, expect, it, vi } from "vitest";

import { EnvBackedOpenClawRuntimeClient } from "@/lib/operator/runtime/openclaw-runtime-client";

describe("EnvBackedOpenClawRuntimeClient", () => {
  it("fetches runtime state from the configured gateway path", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        workspaceLabel: "Northline Advisory",
        executionPolicy: "require-approval",
        toolPermissions: {
          gmailSend: true,
          googleSheetsRead: true,
        },
        deliveryChannels: {
          email: true,
          web: true,
        },
      }),
    });

    const client = new EnvBackedOpenClawRuntimeClient(
      {
        apiToken: "secret",
        applyPolicyPath: "/worker/runtime/policy",
        baseUrl: "https://openclaw.example.com",
        draftPath: "/worker/drafts",
        runtimeStatePath: "/worker/runtime/state",
      },
      fetchImpl,
    );

    await expect(client.fetchRuntimeState()).resolves.toEqual({
      ok: true,
      runtime: {
        deliveryChannels: {
          email: true,
          web: true,
        },
        executionPolicy: "require-approval",
        toolPermissions: {
          gmailSend: true,
          googleSheetsRead: true,
        },
        workspaceLabel: "Northline Advisory",
      },
    });
  });

  it("returns a structured error when policy application fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "gateway unavailable",
    });

    const client = new EnvBackedOpenClawRuntimeClient(
      {
        apiToken: "secret",
        applyPolicyPath: "/worker/runtime/policy",
        baseUrl: "https://openclaw.example.com",
        draftPath: "/worker/drafts",
        runtimeStatePath: "/worker/runtime/state",
      },
      fetchImpl,
    );

    await expect(
      client.applyPolicy({
        deliveryChannels: {
          email: true,
          web: true,
        },
        executionPolicy: "require-approval",
        toolPermissions: {
          gmailSend: true,
          googleSheetsRead: true,
        },
        workspaceLabel: "Northline Advisory",
      }),
    ).resolves.toEqual({
      error: {
        code: "gateway_rejected",
        message: "OpenClaw runtime request failed with 503: gateway unavailable",
        retryable: true,
        status: 503,
      },
      ok: false,
    });
  });
});
