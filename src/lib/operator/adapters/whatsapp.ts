export type WhatsAppActionPayload = Readonly<{
  phoneNumber: string;
  message: string;
  approvalItemId: string;
}>;

export interface WhatsAppAdapter {
  sendActionPrompt(
    payload: WhatsAppActionPayload,
  ): Promise<{ providerMessageId: string }>;
}

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  async sendActionPrompt(payload: WhatsAppActionPayload) {
    return {
      providerMessageId: `mock-wa-${payload.approvalItemId}`,
    };
  }
}
