type IntegrationEnv = Readonly<Record<string, string | undefined>>;

export type GmailAdapterConfig = Readonly<{
  accessToken: string;
  senderEmail: string;
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
  runtimeStatePath: string;
  applyPolicyPath: string;
}>;

export type GoogleOAuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;

export function getOperatorGmailSender(env: IntegrationEnv) {
  const senderEmail = readEnvValue(env.OPERATOR_GMAIL_SENDER);

  if (!senderEmail) {
    throw new Error(
      "OPERATOR_GMAIL_SENDER is required to send Gmail messages from Operator.",
    );
  }

  return senderEmail;
}

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

export function getClerkWebhookSecret(env: IntegrationEnv) {
  const webhookSecret = readEnvValue(env.CLERK_WEBHOOK_SECRET);

  if (!webhookSecret) {
    throw new Error(
      "CLERK_WEBHOOK_SECRET is required to verify Clerk webhook signatures.",
    );
  }

  return webhookSecret;
}

export function getCredentialEncryptionSecret(env: IntegrationEnv) {
  const explicitSecret = readEnvValue(env.OPERATOR_ENCRYPTION_KEY);

  if (explicitSecret) {
    return explicitSecret;
  }

  const clerkSecret = readEnvValue(env.CLERK_SECRET_KEY);

  if (env.NODE_ENV !== "production" && clerkSecret) {
    return clerkSecret;
  }

  throw new Error(
    "OPERATOR_ENCRYPTION_KEY is required in production to protect provider credentials.",
  );
}

export function getOpsUserIds(env: IntegrationEnv) {
  return (readEnvValue(env.OPERATOR_OPS_USER_IDS) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getGoogleOAuthConfig(
  env: IntegrationEnv,
): GoogleOAuthConfig | null {
  const clientId = readEnvValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = readEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  const redirectUri = readEnvValue(env.GOOGLE_OAUTH_REDIRECT_URI);

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
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
    senderEmail: getOperatorGmailSender(env),
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
    runtimeStatePath: normalizePath(
      readEnvValue(env.OPENCLAW_RUNTIME_STATE_PATH) ??
        "/api/operator/runtime/state",
    ),
    applyPolicyPath: normalizePath(
      readEnvValue(env.OPENCLAW_APPLY_POLICY_PATH) ??
        "/api/operator/runtime/policy",
    ),
  };
}
