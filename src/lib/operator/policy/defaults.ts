import { workspaceAgentPolicySchema } from "@/lib/operator/policy/schema";

export function createDefaultAgentPolicy(input: {
  toneGuidance: string;
  workspaceLabel: string;
}) {
  return workspaceAgentPolicySchema.parse({
    version: 1,
    workspaceLabel: input.workspaceLabel,
    agent: {
      name: "Operator",
      toneGuidance: input.toneGuidance,
    },
    tools: {
      gmailSend: true,
      googleSheetsRead: true,
    },
    approvals: {
      requireHumanApproval: true,
    },
    automation: {
      paused: false,
      killSwitch: false,
    },
    channels: {
      web: true,
      email: true,
    },
  });
}
