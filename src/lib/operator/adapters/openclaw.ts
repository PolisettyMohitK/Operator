import {
  getOpenClawAdapterConfig,
  type OpenClawAdapterConfig,
} from "@/lib/operator/integrations/env";

export type DraftRecommendationInput = Readonly<{
  organizationName: string;
  clientName: string;
  invoiceId: string;
  amountDue: number;
  daysOverdue: number;
  toneGuidance: string;
  lastTouchpoint?: string;
}>;

export type DraftRecommendation = Readonly<{
  channel: "email" | "whatsapp";
  rationale: string;
  draftContent: string;
}>;

export type DraftRecommendationResult = Readonly<
  | ({
      ok: true;
    } & DraftRecommendation)
  | ({
      ok: false;
      error: {
        code:
          | "gateway_unreachable"
          | "gateway_rejected"
          | "invalid_response";
        message: string;
        retryable: boolean;
        status?: number;
      };
    } & DraftRecommendation)
>;

export interface OpenClawAdapter {
  createDraftRecommendation(
    input: DraftRecommendationInput,
  ): Promise<DraftRecommendationResult>;
}

export class OpenClawAdapterNotConfiguredError extends Error {
  constructor() {
    super("OpenClaw adapter is not configured.");
  }
}

export class OpenClawDraftError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EnvBackedOpenClawAdapter implements OpenClawAdapter {
  constructor(
    private readonly config: OpenClawAdapterConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createDraftRecommendation(
    input: DraftRecommendationInput,
  ): Promise<DraftRecommendationResult> {
    try {
      const response = await this.fetchImpl(
        `${this.config.baseUrl}${this.config.draftPath}`,
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
          body: JSON.stringify(input),
        },
      );

      if (!response.ok) {
        return buildFallbackRecommendation(input, {
          code: "gateway_rejected",
          message: `OpenClaw draft request failed with ${response.status}: ${await response.text()}`,
          retryable: response.status >= 500,
          status: response.status,
        });
      }

      const data = (await response.json()) as Partial<DraftRecommendation>;

      if (
        (data.channel !== "email" && data.channel !== "whatsapp") ||
        typeof data.rationale !== "string" ||
        typeof data.draftContent !== "string"
      ) {
        return buildFallbackRecommendation(input, {
          code: "invalid_response",
          message: "OpenClaw draft response was missing required fields.",
          retryable: true,
        });
      }

      return {
        ok: true,
        channel: data.channel,
        rationale: data.rationale,
        draftContent: data.draftContent,
      };
    } catch (error) {
      return buildFallbackRecommendation(input, {
        code: "gateway_unreachable",
        message:
          error instanceof Error ? error.message : "OpenClaw gateway was unreachable.",
        retryable: true,
      });
    }
  }
}

export class MockOpenClawAdapter implements OpenClawAdapter {
  async createDraftRecommendation(
    input: DraftRecommendationInput,
  ): Promise<DraftRecommendationResult> {
    return {
      ok: true,
      channel: input.daysOverdue > 7 ? "email" : "whatsapp",
      rationale: `${input.invoiceId} is ${input.daysOverdue} days overdue. Tone preference: ${input.toneGuidance}`,
      draftContent: `Hi ${input.clientName}, this is a follow-up on invoice ${input.invoiceId} for $${input.amountDue.toLocaleString()}. Please confirm payment timing today.`,
    };
  }
}

function buildFallbackRecommendation(
  input: DraftRecommendationInput,
  error: DraftRecommendationResult extends infer Result
    ? Result extends { ok: false; error: infer ErrorShape }
      ? ErrorShape
      : never
    : never,
): DraftRecommendationResult {
  const channel = input.daysOverdue > 7 ? "email" : "whatsapp";

  return {
    ok: false,
    channel,
    rationale: `${input.invoiceId} used the local fallback because OpenClaw could not generate a draft. Tone preference: ${input.toneGuidance}`,
    draftContent: `Hi ${input.clientName}, this is a follow-up on invoice ${input.invoiceId} for $${input.amountDue.toLocaleString()}. Please confirm payment timing today.`,
    error,
  };
}

export function getOpenClawAdapter(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getOpenClawAdapterConfig(env);

  if (!config) {
    throw new OpenClawAdapterNotConfiguredError();
  }

  return new EnvBackedOpenClawAdapter(config, fetchImpl);
}
