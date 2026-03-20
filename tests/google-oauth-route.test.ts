import { beforeEach, describe, expect, it, vi } from "vitest";

const getViewerContextMock = vi.fn();
const getDbMock = vi.fn();

vi.mock("@/lib/operator/datalayer/viewer-context", () => ({
  getViewerContext: getViewerContextMock,
}));

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createInsertChain() {
  return {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function getCookieHeader(setCookieHeader: string | null) {
  return setCookieHeader?.split(";")[0] ?? "";
}

describe("Google OAuth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      "https://operator.example.com/api/oauth/google/callback";
    process.env.CLERK_SECRET_KEY = "clerk-secret";
  });

  it("oauth_start_requires_owner", async () => {
    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      role: "staff",
    });

    const { GET } = await import("@/app/api/oauth/google/start/route");

    const response = await GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=gmail&returnTo=/app/integrations",
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/app/integrations");
    expect(response.headers.get("location")).not.toContain(
      "accounts.google.com",
    );
  });

  it("oauth_start_requires_google_config", async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;

    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      role: "owner",
    });

    const { GET } = await import("@/app/api/oauth/google/start/route");

    const response = await GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=gmail&returnTo=/app/integrations",
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("oauth=config_missing");
  });

  it("oauth_start_sets_state_cookie_and_scopes", async () => {
    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      membershipId: "membership_1",
      role: "owner",
    });

    const { GET } = await import("@/app/api/oauth/google/start/route");

    const response = await GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=google_sheets&returnTo=/app/onboarding",
      ),
    );

    const location = response.headers.get("location");
    const setCookie = response.headers.get("set-cookie");

    expect(response.status).toBe(302);
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain(
      encodeURIComponent("https://www.googleapis.com/auth/spreadsheets.readonly"),
    );
    expect(location).toContain("state=");
    expect(setCookie).toContain("operator_google_oauth_state=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("oauth_callback_rejects_invalid_state", async () => {
    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      membershipId: "membership_1",
      role: "owner",
    });

    const { GET } = await import("@/app/api/oauth/google/callback/route");

    const response = await GET(
      new Request(
        "https://operator.example.com/api/oauth/google/callback?state=invalid&code=code_123",
      ),
    );

    expect(response.status).toBe(400);
  });

  it("oauth_callback_upserts_connected_account_and_token", async () => {
    const accountInsert = createInsertChain();
    const tokenInsert = createInsertChain();
    const activityInsert = createInsertChain();
    const accountUpdate = createUpdateChain();
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(accountInsert)
        .mockReturnValueOnce(tokenInsert)
        .mockReturnValueOnce(activityInsert),
      update: vi.fn().mockReturnValue(accountUpdate),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback) => callback(tx)),
    });

    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      membershipId: "membership_1",
      role: "owner",
    });

    const startRoute = await import("@/app/api/oauth/google/start/route");
    const startResponse = await startRoute.GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=gmail&returnTo=/app/integrations",
      ),
    );
    const state = new URL(startResponse.headers.get("location")!).searchParams.get(
      "state",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "fresh-access-token",
            refresh_token: "fresh-refresh-token",
            expires_in: 3600,
            scope:
              "openid email profile https://www.googleapis.com/auth/gmail.send",
            token_type: "Bearer",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: "google-account-1",
            email: "hello@northline.test",
          }),
        }),
    );

    const callbackRoute = await import("@/app/api/oauth/google/callback/route");
    const callbackResponse = await callbackRoute.GET(
      new Request(
        `https://operator.example.com/api/oauth/google/callback?state=${state}&code=code_123`,
        {
          headers: {
            cookie: getCookieHeader(startResponse.headers.get("set-cookie")),
          },
        },
      ),
    );

    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("location")).toContain("/app/integrations");
    expect(accountInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        externalAccountId: "google-account-1",
        externalAccountLabel: "hello@northline.test",
        organizationId: "org_test",
        provider: "gmail",
        status: "connected",
      }),
    );
    expect(tokenInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        connectedAccountId: expect.any(String),
        encryptedPayload: expect.objectContaining({
          algorithm: "aes-256-gcm",
          ciphertext: expect.any(String),
        }),
      }),
    );
    expect(activityInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_1",
        organizationId: "org_test",
      }),
    );
  });

  it("oauth_callback_reconnect_is_idempotent", async () => {
    const accountInsert = createInsertChain();
    const tokenInsert = createInsertChain();
    const activityInsert = createInsertChain();
    const accountUpdate = createUpdateChain();
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(accountInsert)
        .mockReturnValueOnce(tokenInsert)
        .mockReturnValueOnce(activityInsert)
        .mockReturnValueOnce(accountInsert)
        .mockReturnValueOnce(tokenInsert)
        .mockReturnValueOnce(activityInsert),
      update: vi.fn().mockReturnValue(accountUpdate),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback) => callback(tx)),
    });

    getViewerContextMock.mockResolvedValue({
      organizationId: "org_test",
      membershipId: "membership_1",
      role: "owner",
    });

    const startRoute = await import("@/app/api/oauth/google/start/route");
    const callbackRoute = await import("@/app/api/oauth/google/callback/route");

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "fresh-access-token",
            refresh_token: "fresh-refresh-token",
            expires_in: 3600,
            scope:
              "openid email profile https://www.googleapis.com/auth/gmail.send",
            token_type: "Bearer",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: "google-account-1",
            email: "hello@northline.test",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "new-access-token",
            refresh_token: "fresh-refresh-token",
            expires_in: 3600,
            scope:
              "openid email profile https://www.googleapis.com/auth/gmail.send",
            token_type: "Bearer",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: "google-account-1",
            email: "hello@northline.test",
          }),
        }),
    );

    const firstStart = await startRoute.GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=gmail&returnTo=/app/integrations",
      ),
    );
    const firstState = new URL(firstStart.headers.get("location")!).searchParams.get(
      "state",
    );
    await callbackRoute.GET(
      new Request(
        `https://operator.example.com/api/oauth/google/callback?state=${firstState}&code=code_123`,
        {
          headers: {
            cookie: getCookieHeader(firstStart.headers.get("set-cookie")),
          },
        },
      ),
    );

    const secondStart = await startRoute.GET(
      new Request(
        "https://operator.example.com/api/oauth/google/start?provider=gmail&returnTo=/app/integrations",
      ),
    );
    const secondState = new URL(
      secondStart.headers.get("location")!,
    ).searchParams.get("state");
    await callbackRoute.GET(
      new Request(
        `https://operator.example.com/api/oauth/google/callback?state=${secondState}&code=code_456`,
        {
          headers: {
            cookie: getCookieHeader(secondStart.headers.get("set-cookie")),
          },
        },
      ),
    );

    const firstAccountId = accountInsert.values.mock.calls[0]?.[0]?.id;
    const secondAccountId = accountInsert.values.mock.calls[1]?.[0]?.id;

    expect(firstAccountId).toBe(secondAccountId);
  });
});
