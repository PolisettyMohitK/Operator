import { evaluatePolicyDrift } from "@/lib/operator/policy/reconcile";
import { translatePolicyToRuntimeConfig } from "@/lib/operator/policy/translator";
import type {
  RuntimeConfig,
  WorkspaceAgentPolicy,
} from "@/lib/operator/policy/schema";

type RuntimeClientResult<T> =
  | Readonly<{
      ok: true;
      runtime?: T;
    }>
  | Readonly<{
      ok: false;
      error: {
        message: string;
      };
    }>;

export interface RuntimeClient {
  applyPolicy(config: RuntimeConfig): Promise<RuntimeClientResult<never>>;
  fetchRuntimeState(): Promise<RuntimeClientResult<RuntimeConfig>>;
}

export function createUnavailableRuntimeClient(message: string): RuntimeClient {
  return {
    async applyPolicy() {
      return {
        ok: false,
        error: {
          message,
        },
      };
    },
    async fetchRuntimeState() {
      return {
        ok: false,
        error: {
          message,
        },
      };
    },
  };
}

export async function reconcileRuntimeState(input: {
  policy: WorkspaceAgentPolicy;
  client: RuntimeClient;
}) {
  const runtimeSummary = translatePolicyToRuntimeConfig(input.policy);
  const applyResult = await input.client.applyPolicy(runtimeSummary);

  if (!applyResult.ok) {
    return {
      runtimeStatus: "degraded" as const,
      runtimeSummary,
      observedRuntime: null,
      lastError: applyResult.error.message,
    };
  }

  const observedState = await input.client.fetchRuntimeState();

  if (!observedState.ok) {
    return {
      runtimeStatus: "degraded" as const,
      runtimeSummary,
      observedRuntime: null,
      lastError: observedState.error.message,
    };
  }

  if (!observedState.runtime) {
    return {
      runtimeStatus: "degraded" as const,
      runtimeSummary,
      observedRuntime: null,
      lastError: "OpenClaw did not return an observed runtime state.",
    };
  }

  const driftResult = evaluatePolicyDrift({
    desired: runtimeSummary,
    observed: observedState.runtime,
  });

  return {
    runtimeStatus: driftResult.status === "in_sync" ? ("healthy" as const) : ("degraded" as const),
    runtimeSummary,
    observedRuntime: observedState.runtime,
    lastError: driftResult.status === "in_sync" ? null : driftResult.reasons.join("; "),
  };
}
