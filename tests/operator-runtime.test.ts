import { describe, expect, it } from "vitest";

import { createDefaultAgentPolicy } from "@/lib/operator/policy/defaults";
import { translatePolicyToRuntimeConfig } from "@/lib/operator/policy/translator";
import { reconcileRuntimeState } from "@/lib/operator/runtime/runtime-manager";

describe("reconcileRuntimeState", () => {
  it("marks the runtime healthy when the observed config matches the desired policy", async () => {
    const policy = createDefaultAgentPolicy({
      toneGuidance: "Calm and commercially clear.",
      workspaceLabel: "Northline Advisory",
    });
    const desiredRuntime = translatePolicyToRuntimeConfig(policy);

    await expect(
      reconcileRuntimeState({
        client: {
          applyPolicy: async () => ({
            ok: true,
          }),
          fetchRuntimeState: async () => ({
            ok: true,
            runtime: desiredRuntime,
          }),
        },
        policy,
      }),
    ).resolves.toEqual({
      lastError: null,
      observedRuntime: desiredRuntime,
      runtimeStatus: "healthy",
      runtimeSummary: desiredRuntime,
    });
  });

  it("marks the runtime degraded when policy application fails", async () => {
    const policy = createDefaultAgentPolicy({
      toneGuidance: "Calm and commercially clear.",
      workspaceLabel: "Northline Advisory",
    });

    await expect(
      reconcileRuntimeState({
        client: {
          applyPolicy: async () => ({
            error: {
              message: "Gateway rejected the policy update.",
            },
            ok: false,
          }),
          fetchRuntimeState: async () => ({
            error: {
              message: "No runtime state available.",
            },
            ok: false,
          }),
        },
        policy,
      }),
    ).resolves.toEqual({
      lastError: "Gateway rejected the policy update.",
      observedRuntime: null,
      runtimeStatus: "degraded",
      runtimeSummary: translatePolicyToRuntimeConfig(policy),
    });
  });
});
