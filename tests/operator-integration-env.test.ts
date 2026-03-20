import { describe, expect, it } from "vitest";

import {
  getClerkWebhookSecret,
  getCredentialEncryptionSecret,
  getApprovalLinkSecret,
  getGmailAdapterConfig,
  getGoogleOAuthConfig,
  getGoogleSheetsAdapterConfig,
  getOpenClawAdapterConfig,
  getOpsUserIds,
  getOperatorAppUrl,
  getWhatsAppAdapterConfig,
} from "@/lib/operator/integrations/env";

describe("getOperatorAppUrl", () => {
  it("prefers the explicit app URL when provided", () => {
    expect(
      getOperatorAppUrl({
        APP_URL: " https://operator.example.com ",
      }),
    ).toBe("https://operator.example.com");
  });

  it("falls back to localhost during development", () => {
    expect(getOperatorAppUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000",
    );
  });

  it("returns null in production when no URL is configured", () => {
    expect(getOperatorAppUrl({ NODE_ENV: "production" })).toBeNull();
  });
});

describe("getApprovalLinkSecret", () => {
  it("prefers the dedicated approval-link secret", () => {
    expect(
      getApprovalLinkSecret({
        OPERATOR_APPROVAL_LINK_SECRET: " approval-secret ",
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toBe("approval-secret");
  });

  it("falls back to the Clerk secret when needed", () => {
    expect(
      getApprovalLinkSecret({
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toBe("clerk-secret");
  });
});

describe("provider adapter config helpers", () => {
  it("returns Gmail config only when the workspace token and sender are present", () => {
    expect(
      getGmailAdapterConfig({
        GOOGLE_WORKSPACE_ACCESS_TOKEN: "token",
        OPERATOR_GMAIL_SENDER: "hello@operator.com",
      }),
    ).toEqual({
      accessToken: "token",
      senderEmail: "hello@operator.com",
    });

    expect(getGmailAdapterConfig({})).toBeNull();
  });

  it("throws when Gmail is configured without an explicit sender", () => {
    expect(() =>
      getGmailAdapterConfig({
        GOOGLE_WORKSPACE_ACCESS_TOKEN: "token",
      }),
    ).toThrow("OPERATOR_GMAIL_SENDER is required");
  });

  it("returns Sheets config when either an OAuth token or API key is present", () => {
    expect(
      getGoogleSheetsAdapterConfig({
        GOOGLE_WORKSPACE_ACCESS_TOKEN: "token",
      }),
    ).toEqual({
      accessToken: "token",
      apiKey: null,
    });

    expect(
      getGoogleSheetsAdapterConfig({
        GOOGLE_SHEETS_API_KEY: "api-key",
      }),
    ).toEqual({
      accessToken: null,
      apiKey: "api-key",
    });
  });

  it("returns WhatsApp config with the default graph version", () => {
    expect(
      getWhatsAppAdapterConfig({
        WHATSAPP_ACCESS_TOKEN: "wa-token",
        WHATSAPP_PHONE_NUMBER_ID: "12345",
      }),
    ).toEqual({
      accessToken: "wa-token",
      phoneNumberId: "12345",
      graphVersion: "v23.0",
      verifyToken: null,
    });
  });

  it("returns OpenClaw config with the default draft endpoint", () => {
    expect(
      getOpenClawAdapterConfig({
        OPENCLAW_BASE_URL: " https://openclaw.example.com/ ",
        OPENCLAW_API_TOKEN: "secret",
      }),
    ).toEqual({
      apiToken: "secret",
      applyPolicyPath: "/api/operator/runtime/policy",
      baseUrl: "https://openclaw.example.com",
      draftPath: "/api/operator/draft-recommendations",
      runtimeStatePath: "/api/operator/runtime/state",
    });
  });
});

describe("getClerkWebhookSecret", () => {
  it("returns the configured webhook secret", () => {
    expect(
      getClerkWebhookSecret({
        CLERK_WEBHOOK_SECRET: " whsec_123 ",
      }),
    ).toBe("whsec_123");
  });

  it("throws when the webhook secret is missing", () => {
    expect(() => getClerkWebhookSecret({})).toThrow(
      "CLERK_WEBHOOK_SECRET is required",
    );
  });
});

describe("credential and provider helpers", () => {
  it("returns the Google OAuth config only when the full provider config exists", () => {
    expect(
      getGoogleOAuthConfig({
        GOOGLE_OAUTH_CLIENT_ID: "client-id",
        GOOGLE_OAUTH_CLIENT_SECRET: "client-secret",
        GOOGLE_OAUTH_REDIRECT_URI: "https://operator.example.com/api/oauth/google",
      }),
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://operator.example.com/api/oauth/google",
    });

    expect(getGoogleOAuthConfig({})).toBeNull();
  });

  it("returns a dedicated encryption secret when configured", () => {
    expect(
      getCredentialEncryptionSecret({
        OPERATOR_ENCRYPTION_KEY: " encrypted-secret ",
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toBe("encrypted-secret");
  });

  it("falls back to the Clerk secret only in explicit development and test environments", () => {
    expect(
      getCredentialEncryptionSecret({
        NODE_ENV: "development",
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toBe("clerk-secret");

    expect(
      getCredentialEncryptionSecret({
        NODE_ENV: "test",
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toBe("clerk-secret");

    expect(() =>
      getCredentialEncryptionSecret({
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toThrow("OPERATOR_ENCRYPTION_KEY is required");

    expect(() =>
      getCredentialEncryptionSecret({
        NODE_ENV: "production",
        CLERK_SECRET_KEY: "clerk-secret",
      }),
    ).toThrow("OPERATOR_ENCRYPTION_KEY is required");
  });

  it("parses the ops allowlist from comma-delimited env values", () => {
    expect(
      getOpsUserIds({
        OPERATOR_OPS_USER_IDS: " user_1, user_2 ,, user_3 ",
      }),
    ).toEqual(["user_1", "user_2", "user_3"]);
  });
});
