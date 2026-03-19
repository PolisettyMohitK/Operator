export type GmailDraftPayload = Readonly<{
  subject: string;
  body: string;
  recipient: string;
}>;

export interface GmailAdapter {
  sendDraft(payload: GmailDraftPayload): Promise<{ providerMessageId: string }>;
}

export class GmailAdapterNotConfiguredError extends Error {
  constructor() {
    super("Gmail adapter is not configured.");
  }
}

export class MockGmailAdapter implements GmailAdapter {
  async sendDraft(payload: GmailDraftPayload) {
    return {
      providerMessageId: `mock-gmail-${payload.recipient.toLowerCase()}`,
    };
  }
}
