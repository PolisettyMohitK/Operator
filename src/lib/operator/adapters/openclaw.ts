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

export interface OpenClawAdapter {
  createDraftRecommendation(
    input: DraftRecommendationInput,
  ): Promise<DraftRecommendation>;
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
  ): Promise<DraftRecommendation> {
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
      throw new OpenClawDraftError(
        `OpenClaw draft request failed with ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as Partial<DraftRecommendation>;

    if (
      (data.channel !== "email" && data.channel !== "whatsapp") ||
      typeof data.rationale !== "string" ||
      typeof data.draftContent !== "string"
    ) {
      throw new OpenClawDraftError(
        "OpenClaw draft response was missing required fields.",
      );
    }

    return {
      channel: data.channel,
      rationale: data.rationale,
      draftContent: data.draftContent,
    };
  }
}

export class MockOpenClawAdapter implements OpenClawAdapter {
  async createDraftRecommendation(
    input: DraftRecommendationInput,
  ): Promise<DraftRecommendation> {
    return {
      channel: input.daysOverdue > 7 ? "email" : "whatsapp",
      rationale: `${input.invoiceId} is ${input.daysOverdue} days overdue. Tone preference: ${input.toneGuidance}`,
      draftContent: `Hi ${input.clientName}, this is a follow-up on invoice ${input.invoiceId} for $${input.amountDue.toLocaleString()}. Please confirm payment timing today.`,
    };
  }
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
