import { describe, expect, it } from "vitest";

import { createDefaultAgentPolicy } from "@/lib/operator/policy/defaults";
import { summarizePolicyChanges } from "@/lib/operator/policy/diff";
import { evaluatePolicyDrift } from "@/lib/operator/policy/reconcile";
import { translatePolicyToRuntimeConfig } from "@/lib/operator/policy/translator";

describe("agent policy defaults", () => {
  it("creates a safe V1 invoice-recovery policy", () => {
    expect(
      createDefaultAgentPolicy({
        toneGuidance: "Calm and commercially clear.",
        workspaceLabel: "Northline Advisory",
      }),
    ).toEqual({
      agent: {
        name: "Operator",
        toneGuidance: "Calm and commercially clear.",
      },
      approvals: {
        requireHumanApproval: true,
      },
      automation: {
        killSwitch: false,
        paused: false,
      },
      channels: {
        email: true,
        web: true,
      },
      tools: {
        gmailSend: true,
        googleSheetsRead: true,
      },
      version: 1,
      workspaceLabel: "Northline Advisory",
    });
  });
});

describe("policy diffs", () => {
  it("flags permission increases and kill-switch activation as confirmation-worthy changes", () => {
    const previous = createDefaultAgentPolicy({
      toneGuidance: "Calm and commercially clear.",
      workspaceLabel: "Northline Advisory",
    });
    const next = {
      ...previous,
      automation: {
        ...previous.automation,
        killSwitch: true,
      },
      tools: {
        ...previous.tools,
        gmailSend: false,
      },
    };

    expect(summarizePolicyChanges(previous, next)).toEqual([
      {
        after: false,
        before: true,
        description: "Operator will stop sending Gmail follow-ups for this workspace.",
        effect: "permission_decrease",
        path: "tools.gmailSend",
        requiresConfirmation: true,
      },
      {
        after: true,
        before: false,
        description: "The workspace kill switch will pause all OpenClaw-backed execution.",
        effect: "runtime_pause",
        path: "automation.killSwitch",
        requiresConfirmation: true,
      },
    ]);
  });
});

describe("policy translation and drift detection", () => {
  it("translates a kill-switched policy into a paused runtime config", () => {
    const policy = {
      ...createDefaultAgentPolicy({
        toneGuidance: "Calm and commercially clear.",
        workspaceLabel: "Northline Advisory",
      }),
      automation: {
        killSwitch: true,
        paused: false,
      },
    };

    expect(translatePolicyToRuntimeConfig(policy)).toEqual({
      deliveryChannels: {
        email: true,
        web: true,
      },
      executionPolicy: "paused",
      toolPermissions: {
        gmailSend: false,
        googleSheetsRead: false,
      },
      workspaceLabel: "Northline Advisory",
    });
  });

  it("marks the workspace drifted when the observed runtime diverges from desired state", () => {
    const policy = createDefaultAgentPolicy({
      toneGuidance: "Calm and commercially clear.",
      workspaceLabel: "Northline Advisory",
    });

    expect(
      evaluatePolicyDrift({
        desired: translatePolicyToRuntimeConfig(policy),
        observed: {
          deliveryChannels: {
            email: true,
            web: true,
          },
          executionPolicy: "paused",
          toolPermissions: {
            gmailSend: false,
            googleSheetsRead: true,
          },
          workspaceLabel: "Northline Advisory",
        },
      }),
    ).toEqual({
      reasons: [
        "executionPolicy differs",
        "toolPermissions.gmailSend differs",
      ],
      status: "drifted",
    });
  });
});
