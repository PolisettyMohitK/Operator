import { getGmailAdapterConfig, type GmailAdapterConfig } from "@/lib/operator/integrations/env";

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

export class GmailSendDraftError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function buildMimeMessage(
  payload: GmailDraftPayload,
  senderEmail: string | null,
) {
  const messageLines = [
    senderEmail ? `From: ${senderEmail}` : null,
    `To: ${payload.recipient}`,
    `Subject: ${payload.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    payload.body,
  ].filter(Boolean);

  return encodeBase64Url(messageLines.join("\r\n"));
}

export class EnvBackedGmailAdapter implements GmailAdapter {
  constructor(
    private readonly config: GmailAdapterConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendDraft(payload: GmailDraftPayload) {
    const response = await this.fetchImpl(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: buildMimeMessage(payload, this.config.senderEmail),
        }),
      },
    );

    if (!response.ok) {
      throw new GmailSendDraftError(
        `Gmail send failed with ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as { id?: string };

    if (!data.id) {
      throw new GmailSendDraftError("Gmail send did not return a message id.");
    }

    return {
      providerMessageId: data.id,
    };
  }
}

export class MockGmailAdapter implements GmailAdapter {
  async sendDraft(payload: GmailDraftPayload) {
    return {
      providerMessageId: `mock-gmail-${payload.recipient.toLowerCase()}`,
    };
  }
}

export function getGmailAdapter(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getGmailAdapterConfig(env);

  if (!config) {
    throw new GmailAdapterNotConfiguredError();
  }

  return new EnvBackedGmailAdapter(config, fetchImpl);
}
