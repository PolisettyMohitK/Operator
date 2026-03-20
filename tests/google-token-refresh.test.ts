import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("refreshGoogleConnectedAccountCredentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      "https://operator.example.com/api/oauth/google/callback";
  });

  it("resolver_refreshes_expired_google_token", async () => {
    const accountUpdate = createUpdateChain();
    const tokenUpdate = createUpdateChain();
    const tx = {
      update: vi
        .fn()
        .mockReturnValueOnce(accountUpdate)
        .mockReturnValueOnce(tokenUpdate),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback) => callback(tx)),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "refreshed-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
        }),
      }),
    );

    const { refreshGoogleConnectedAccountCredentials } = await import(
      "@/lib/operator/credentials/google-refresh"
    );

    const result = await refreshGoogleConnectedAccountCredentials({
      connectedAccountId: "connected_gmail_1",
      currentCredentials: {
        accessToken: "expired-access-token",
        expiresAt: new Date("2025-03-19T00:00:00Z").toISOString(),
        refreshToken: "refresh-token",
        scopes: ["https://www.googleapis.com/auth/gmail.send"],
        tokenType: "Bearer",
      },
      encryptionSecret: "local-dev-secret",
      externalAccountId: "google-account-1",
      externalAccountLabel: "hello@northline.test",
      grantedScopes: ["https://www.googleapis.com/auth/gmail.send"],
      organizationId: "org_test",
      provider: "gmail",
    });

    expect(result).toEqual({
      accessToken: "refreshed-access-token",
      connectedAccountId: "connected_gmail_1",
      expiresAt: expect.any(String),
      externalAccountId: "google-account-1",
      externalAccountLabel: "hello@northline.test",
      grantedScopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      provider: "gmail",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    expect(accountUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        reconnectReason: null,
        status: "connected",
      }),
    );
    expect(tokenUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedPayload: expect.objectContaining({
          algorithm: "aes-256-gcm",
        }),
      }),
    );
  });

  it("resolver_marks_reconnect_required_on_invalid_grant", async () => {
    const accountUpdate = createUpdateChain();
    const tx = {
      update: vi.fn().mockReturnValue(accountUpdate),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback) => callback(tx)),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        }),
        text: async () => "invalid_grant",
      }),
    );

    const { refreshGoogleConnectedAccountCredentials } = await import(
      "@/lib/operator/credentials/google-refresh"
    );

    await expect(
      refreshGoogleConnectedAccountCredentials({
        connectedAccountId: "connected_gmail_1",
        currentCredentials: {
          accessToken: "expired-access-token",
          expiresAt: new Date("2025-03-19T00:00:00Z").toISOString(),
          refreshToken: "refresh-token",
          scopes: ["https://www.googleapis.com/auth/gmail.send"],
          tokenType: "Bearer",
        },
        encryptionSecret: "local-dev-secret",
        externalAccountId: "google-account-1",
        externalAccountLabel: "hello@northline.test",
        grantedScopes: ["https://www.googleapis.com/auth/gmail.send"],
        organizationId: "org_test",
        provider: "gmail",
      }),
    ).resolves.toBeNull();

    expect(accountUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        reconnectReason: expect.stringContaining("Reconnect"),
        status: "reconnect_required",
      }),
    );
  });
});
