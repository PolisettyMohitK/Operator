type IntegrationEnv = Readonly<Record<string, string | undefined>>;

export type GmailAdapterConfig = Readonly<{
  accessToken: string;
  senderEmail: string | null;
}>;

export type GoogleSheetsAdapterConfig = Readonly<{
  accessToken: string | null;
  apiKey: string | null;
}>;

export type WhatsAppAdapterConfig = Readonly<{
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  verifyToken: string | null;
}>;

export type OpenClawAdapterConfig = Readonly<{
  baseUrl: string;
  apiToken: string | null;
  draftPath: string;
}>;

function readEnvValue(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

export function getOperatorAppUrl(env: IntegrationEnv) {
  const configuredUrl =
    readEnvValue(env.APP_URL) ?? readEnvValue(env.NEXT_PUBLIC_APP_URL);

  if (configuredUrl) {
    return stripTrailingSlash(configuredUrl);
  }

  if (env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  return null;
}

export function getApprovalLinkSecret(env: IntegrationEnv) {
  return (
    readEnvValue(env.OPERATOR_APPROVAL_LINK_SECRET) ??
    readEnvValue(env.CLERK_SECRET_KEY)
  );
}

export function getGmailAdapterConfig(
  env: IntegrationEnv,
): GmailAdapterConfig | null {
  const accessToken = readEnvValue(env.GOOGLE_WORKSPACE_ACCESS_TOKEN);

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    senderEmail: readEnvValue(env.OPERATOR_GMAIL_SENDER),
  };
}

export function getGoogleSheetsAdapterConfig(
  env: IntegrationEnv,
): GoogleSheetsAdapterConfig | null {
  const accessToken = readEnvValue(env.GOOGLE_WORKSPACE_ACCESS_TOKEN);
  const apiKey = readEnvValue(env.GOOGLE_SHEETS_API_KEY);

  if (!accessToken && !apiKey) {
    return null;
  }

  return {
    accessToken,
    apiKey,
  };
}

export function getWhatsAppAdapterConfig(
  env: IntegrationEnv,
): WhatsAppAdapterConfig | null {
  const accessToken = readEnvValue(env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = readEnvValue(env.WHATSAPP_PHONE_NUMBER_ID);

  if (!accessToken || !phoneNumberId) {
    return null;
  }

  return {
    accessToken,
    phoneNumberId,
    graphVersion: readEnvValue(env.WHATSAPP_GRAPH_VERSION) ?? "v23.0",
    verifyToken: readEnvValue(env.WHATSAPP_VERIFY_TOKEN),
  };
}

export function getOpenClawAdapterConfig(
  env: IntegrationEnv,
): OpenClawAdapterConfig | null {
  const baseUrl = readEnvValue(env.OPENCLAW_BASE_URL);

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: stripTrailingSlash(baseUrl),
    apiToken: readEnvValue(env.OPENCLAW_API_TOKEN),
    draftPath: normalizePath(
      readEnvValue(env.OPENCLAW_DRAFT_PATH) ??
        "/api/operator/draft-recommendations",
    ),
  };
}
