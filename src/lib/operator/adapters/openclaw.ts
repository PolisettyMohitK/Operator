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
