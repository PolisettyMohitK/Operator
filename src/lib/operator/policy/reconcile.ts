import type { RuntimeConfig } from "@/lib/operator/policy/schema";

export type PolicyDriftResult = Readonly<{
  status: "in_sync" | "drifted";
  reasons: string[];
}>;

export function evaluatePolicyDrift(input: {
  desired: RuntimeConfig;
  observed: RuntimeConfig;
}): PolicyDriftResult {
  const reasons: string[] = [];

  if (input.desired.executionPolicy !== input.observed.executionPolicy) {
    reasons.push("executionPolicy differs");
  }

  if (
    input.desired.toolPermissions.gmailSend !==
    input.observed.toolPermissions.gmailSend
  ) {
    reasons.push("toolPermissions.gmailSend differs");
  }

  if (
    input.desired.toolPermissions.googleSheetsRead !==
    input.observed.toolPermissions.googleSheetsRead
  ) {
    reasons.push("toolPermissions.googleSheetsRead differs");
  }

  if (input.desired.deliveryChannels.email !== input.observed.deliveryChannels.email) {
    reasons.push("deliveryChannels.email differs");
  }

  if (input.desired.deliveryChannels.web !== input.observed.deliveryChannels.web) {
    reasons.push("deliveryChannels.web differs");
  }

  return {
    status: reasons.length > 0 ? "drifted" : "in_sync",
    reasons,
  };
}
