import {
  runtimeConfigSchema,
  type WorkspaceAgentPolicy,
} from "@/lib/operator/policy/schema";

export function translatePolicyToRuntimeConfig(policy: WorkspaceAgentPolicy) {
  const paused = policy.automation.killSwitch || policy.automation.paused;

  return runtimeConfigSchema.parse({
    workspaceLabel: policy.workspaceLabel,
    executionPolicy: paused ? "paused" : "require-approval",
    toolPermissions: {
      gmailSend: paused ? false : policy.tools.gmailSend,
      googleSheetsRead: paused ? false : policy.tools.googleSheetsRead,
    },
    deliveryChannels: {
      web: policy.channels.web,
      email: policy.channels.email,
    },
  });
}
