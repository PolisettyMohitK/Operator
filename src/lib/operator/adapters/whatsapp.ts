import {
  getWhatsAppAdapterConfig,
  type WhatsAppAdapterConfig,
} from "@/lib/operator/integrations/env";

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

export class WhatsAppAdapterNotConfiguredError extends Error {
  constructor() {
    super("WhatsApp adapter is not configured.");
  }
}

export class WhatsAppSendError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function buildMessagesUrl(config: WhatsAppAdapterConfig) {
  return `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
}

export class EnvBackedWhatsAppAdapter implements WhatsAppAdapter {
  constructor(
    private readonly config: WhatsAppAdapterConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendActionPrompt(payload: WhatsAppActionPayload) {
    const response = await this.fetchImpl(buildMessagesUrl(this.config), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: payload.phoneNumber,
        type: "text",
        text: {
          body: payload.message,
          preview_url: true,
        },
      }),
    });

    if (!response.ok) {
      throw new WhatsAppSendError(
        `WhatsApp send failed with ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };
    const providerMessageId = data.messages?.[0]?.id;

    if (!providerMessageId) {
      throw new WhatsAppSendError(
        "WhatsApp send did not return a provider message id.",
      );
    }

    return { providerMessageId };
  }
}

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  async sendActionPrompt(payload: WhatsAppActionPayload) {
    return {
      providerMessageId: `mock-wa-${payload.approvalItemId}`,
    };
  }
}

export function getWhatsAppAdapter(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getWhatsAppAdapterConfig(env);

  if (!config) {
    throw new WhatsAppAdapterNotConfiguredError();
  }

  return new EnvBackedWhatsAppAdapter(config, fetchImpl);
}
