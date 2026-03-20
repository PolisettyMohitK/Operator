import type { WorkspaceAgentPolicy } from "@/lib/operator/policy/schema";

export type PolicyChangeSummary = Readonly<{
  path: string;
  before: boolean;
  after: boolean;
  effect:
    | "permission_increase"
    | "permission_decrease"
    | "runtime_pause"
    | "runtime_resume";
  requiresConfirmation: boolean;
  description: string;
}>;

export function summarizePolicyChanges(
  previous: WorkspaceAgentPolicy,
  next: WorkspaceAgentPolicy,
): PolicyChangeSummary[] {
  const changes: PolicyChangeSummary[] = [];

  if (previous.tools.gmailSend !== next.tools.gmailSend) {
    changes.push({
      path: "tools.gmailSend",
      before: previous.tools.gmailSend,
      after: next.tools.gmailSend,
      effect: next.tools.gmailSend
        ? "permission_increase"
        : "permission_decrease",
      requiresConfirmation: true,
      description: next.tools.gmailSend
        ? "Operator will be allowed to send Gmail follow-ups for this workspace."
        : "Operator will stop sending Gmail follow-ups for this workspace.",
    });
  }

  if (previous.automation.killSwitch !== next.automation.killSwitch) {
    changes.push({
      path: "automation.killSwitch",
      before: previous.automation.killSwitch,
      after: next.automation.killSwitch,
      effect: next.automation.killSwitch ? "runtime_pause" : "runtime_resume",
      requiresConfirmation: true,
      description: next.automation.killSwitch
        ? "The workspace kill switch will pause all OpenClaw-backed execution."
        : "The workspace kill switch will allow OpenClaw-backed execution to resume.",
    });
  }

  return changes;
}
