import { describe, expect, it } from "vitest";

import {
  getApprovalLinkSecret,
  getGmailAdapterConfig,
  getGoogleSheetsAdapterConfig,
  getOpenClawAdapterConfig,
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
  it("returns Gmail config only when the workspace token is present", () => {
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
      baseUrl: "https://openclaw.example.com",
      draftPath: "/api/operator/draft-recommendations",
    });
  });
});
