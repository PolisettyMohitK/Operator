import {
  getOpenClawAdapterConfig,
  type OpenClawAdapterConfig,
} from "@/lib/operator/integrations/env";
import { runtimeConfigSchema, type RuntimeConfig } from "@/lib/operator/policy/schema";

type RuntimeMutationResult =
  | Readonly<{
      ok: true;
    }>
  | Readonly<{
      ok: false;
      error: {
        code: "gateway_unreachable" | "gateway_rejected" | "invalid_response";
        message: string;
        retryable: boolean;
        status?: number;
      };
    }>;

type RuntimeStateResult =
  | Readonly<{
      ok: true;
      runtime: RuntimeConfig;
    }>
  | Readonly<{
      ok: false;
      error: {
        code: "gateway_unreachable" | "gateway_rejected" | "invalid_response";
        message: string;
        retryable: boolean;
        status?: number;
      };
    }>;

async function readRuntimeError(response: Response) {
  return `OpenClaw runtime request failed with ${response.status}: ${await response.text()}`;
}

export class EnvBackedOpenClawRuntimeClient {
  constructor(
    private readonly config: OpenClawAdapterConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchRuntimeState(): Promise<RuntimeStateResult> {
    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}${this.config.runtimeStatePath}`,
        {
          headers: {
            ...(this.config.apiToken
              ? {
                  Authorization: `Bearer ${this.config.apiToken}`,
                }
              : {}),
          },
        },
      );

      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "gateway_rejected",
            message: await readRuntimeError(response),
            retryable: response.status >= 500,
            status: response.status,
          },
        };
      }

      const data = await response.json();

      return {
        ok: true,
        runtime: runtimeConfigSchema.parse(data),
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "gateway_unreachable",
          message:
            error instanceof Error
              ? error.message
              : "OpenClaw runtime state is unreachable.",
          retryable: true,
        },
      };
    }
  }

  async applyPolicy(config: RuntimeConfig): Promise<RuntimeMutationResult> {
    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}${this.config.applyPolicyPath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.config.apiToken
              ? {
                  Authorization: `Bearer ${this.config.apiToken}`,
                }
              : {}),
          },
          body: JSON.stringify(config),
        },
      );

      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "gateway_rejected",
            message: await readRuntimeError(response),
            retryable: response.status >= 500,
            status: response.status,
          },
        };
      }

      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "gateway_unreachable",
          message:
            error instanceof Error
              ? error.message
              : "OpenClaw runtime policy update is unreachable.",
          retryable: true,
        },
      };
    }
  }
}

export function getOpenClawRuntimeClient(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getOpenClawAdapterConfig(env);

  if (!config) {
    return null;
  }

  return new EnvBackedOpenClawRuntimeClient(config, fetchImpl);
}
