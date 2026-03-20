import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { GoogleOAuthConfig } from "@/lib/operator/integrations/env";
import {
  getApprovalLinkSecret,
  getGoogleOAuthConfig,
  getOperatorAppUrl,
} from "@/lib/operator/integrations/env";
import {
  getGoogleOAuthScopes,
  parseGoogleOAuthProvider,
  type GoogleOAuthProvider,
} from "@/lib/operator/oauth/google-scopes";

export const GOOGLE_OAUTH_STATE_COOKIE = "operator_google_oauth_state";
const GOOGLE_OAUTH_STATE_TTL_SECONDS = 60 * 10;

export type GoogleOAuthStatePayload = Readonly<{
  codeVerifier: string;
  issuedAt: string;
  membershipId: string;
  nonce: string;
  organizationId: string;
  provider: GoogleOAuthProvider;
  returnTo: string;
}>;

export type GoogleOAuthTokenResponse = Readonly<{
  accessToken: string;
  expiresIn: number | null;
  refreshToken?: string;
  scopes: string[];
  tokenType: string;
}>;

export type GoogleAccountIdentity = Readonly<{
  externalAccountId: string;
  externalAccountLabel: string;
}>;

type GoogleTokenErrorCode = "invalid_grant" | "gateway_rejected" | "network_error";

export type GoogleTokenError = Readonly<{
  code: GoogleTokenErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
}>;

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createCodeVerifier() {
  return randomBytes(48).toString("base64url");
}

function createNonce() {
  return randomBytes(24).toString("base64url");
}

export function sanitizeOAuthReturnTo(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized?.startsWith("/") || normalized.startsWith("//")) {
    return "/app/integrations";
  }

  return normalized;
}

export function buildConnectedGoogleAccountId(input: Readonly<{
  organizationId: string;
  provider: GoogleOAuthProvider;
  externalAccountId: string;
}>) {
  return `connected_${input.provider}_${slugify(input.organizationId)}_${slugify(input.externalAccountId)}`.slice(
    0,
    120,
  );
}

export function buildConnectedGoogleTokenId(connectedAccountId: string) {
  return `token_${slugify(connectedAccountId)}`.slice(0, 120);
}

function getGoogleOAuthStateSecret(
  env: Readonly<Record<string, string | undefined>>,
) {
  const secret = getApprovalLinkSecret(env);

  if (!secret) {
    throw new Error(
      "A signing secret is required to protect the Google OAuth state cookie.",
    );
  }

  return secret;
}

function createSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function buildCookieAttributes(
  env: Readonly<Record<string, string | undefined>>,
  maxAgeSeconds: number,
) {
  const appUrl = getOperatorAppUrl(env);
  const isSecure =
    env.NODE_ENV === "production" || appUrl?.startsWith("https://") === true;

  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isSecure ? "Secure" : null,
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearGoogleOAuthStateCookie(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  return `${GOOGLE_OAUTH_STATE_COOKIE}=; ${buildCookieAttributes(env, 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function createGoogleOAuthStateCookie(
  input: Readonly<{
    membershipId: string;
    organizationId: string;
    provider: GoogleOAuthProvider;
    returnTo: string;
    env?: Readonly<Record<string, string | undefined>>;
    now?: Date;
  }>,
) {
  const env = input.env ?? process.env;
  const payload: GoogleOAuthStatePayload = {
    codeVerifier: createCodeVerifier(),
    issuedAt: (input.now ?? new Date()).toISOString(),
    membershipId: input.membershipId,
    nonce: createNonce(),
    organizationId: input.organizationId,
    provider: input.provider,
    returnTo: sanitizeOAuthReturnTo(input.returnTo),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createSignature(
    encodedPayload,
    getGoogleOAuthStateSecret(env),
  );

  return {
    payload,
    setCookieHeader: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodedPayload}.${signature}; ${buildCookieAttributes(env, GOOGLE_OAUTH_STATE_TTL_SECONDS)}`,
  };
}

export function parseGoogleOAuthStateCookie(
  cookieValue: string | null | undefined,
  env: Readonly<Record<string, string | undefined>> = process.env,
  now = new Date(),
) {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(
    encodedPayload,
    getGoogleOAuthStateSecret(env),
  );

  if (!secureCompare(expectedSignature, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as GoogleOAuthStatePayload;
    const issuedAt = new Date(payload.issuedAt);

    if (Number.isNaN(issuedAt.getTime())) {
      return null;
    }

    if (
      now.getTime() - issuedAt.getTime() >
      GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000
    ) {
      return null;
    }

    if (!parseGoogleOAuthProvider(payload.provider)) {
      return null;
    }

    return {
      ...payload,
      returnTo: sanitizeOAuthReturnTo(payload.returnTo),
    } satisfies GoogleOAuthStatePayload;
  } catch {
    return null;
  }
}

export function readGoogleOAuthStateCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  return (
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=`))
      ?.slice(`${GOOGLE_OAUTH_STATE_COOKIE}=`.length) ?? null
  );
}

export function buildGoogleOAuthAuthorizationUrl(input: Readonly<{
  config: GoogleOAuthConfig;
  provider: GoogleOAuthProvider;
  state: string;
  codeVerifier: string;
}>) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  const codeChallenge = createHash("sha256")
    .update(input.codeVerifier, "utf8")
    .digest("base64url");

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    getGoogleOAuthScopes(input.provider).join(" "),
  );
  url.searchParams.set("state", input.state);

  return url.toString();
}

async function requestGoogleToken(
  body: URLSearchParams,
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<
  | {
      ok: true;
      value: GoogleOAuthTokenResponse;
    }
  | {
      ok: false;
      error: GoogleTokenError;
    }
> {
  try {
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const data = (await response.json().catch(async () => null)) as
        | {
            error?: string;
            error_description?: string;
          }
        | null;
      const text =
        data?.error_description ??
        data?.error ??
        (await response.text().catch(async () => "Google rejected the OAuth request."));

      return {
        error: {
          code:
            data?.error === "invalid_grant" ? "invalid_grant" : "gateway_rejected",
          message: text,
          retryable: response.status >= 500 || response.status === 429,
          status: response.status,
        },
        ok: false,
      };
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
    };

    return {
      ok: true,
      value: {
        accessToken: payload.access_token,
        expiresIn:
          typeof payload.expires_in === "number" ? payload.expires_in : null,
        refreshToken: payload.refresh_token,
        scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
        tokenType: payload.token_type ?? "Bearer",
      },
    };
  } catch (error) {
    return {
      error: {
        code: "network_error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the Google OAuth endpoint.",
        retryable: true,
      },
      ok: false,
    };
  }
}

export async function exchangeGoogleAuthorizationCode(input: Readonly<{
  code: string;
  codeVerifier: string;
  config: GoogleOAuthConfig;
  fetchImpl?: typeof fetch;
}>) {
  const body = new URLSearchParams({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: input.config.redirectUri,
  });

  return requestGoogleToken(body, input.config, input.fetchImpl);
}

export async function refreshGoogleAccessToken(input: Readonly<{
  config: GoogleOAuthConfig;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}>) {
  const body = new URLSearchParams({
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  });

  return requestGoogleToken(body, input.config, input.fetchImpl);
}

export async function fetchGoogleAccountIdentity(input: Readonly<{
  accessToken: string;
  fetchImpl?: typeof fetch;
}>) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google account identity lookup failed with ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    email?: string;
    sub?: string;
  };

  if (!payload.sub) {
    throw new Error("Google account identity is missing the account id.");
  }

  return {
    externalAccountId: payload.sub,
    externalAccountLabel:
      payload.email?.trim() || `Google account ${payload.sub.slice(0, 8)}`,
  } satisfies GoogleAccountIdentity;
}

export function getRequiredGoogleOAuthConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const config = getGoogleOAuthConfig(env);

  if (!config) {
    throw new Error(
      "Google OAuth is not configured. GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI are required.",
    );
  }

  return config;
}
