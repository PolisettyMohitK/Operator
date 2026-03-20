import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  encryptCredentialEnvelope,
  serializeProviderCredentialPayload,
} from "@/lib/operator/credentials/store";

const getDbMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("resolveConnectedAccountCredentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns decrypted account credentials for a connected provider", async () => {
    const envelope = encryptCredentialEnvelope(
      serializeProviderCredentialPayload({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        scopes: ["gmail.send"],
      }),
      "local-dev-secret",
    );
    const rows = createSelectChain([
      {
        connectedAccountId: "account_gmail",
        externalAccountId: "google-account-1",
        externalAccountLabel: "owner@northline.test",
        grantedScopes: ["gmail.send"],
        provider: "gmail",
        status: "connected",
        encryptedPayload: envelope,
      },
    ]);

    getDbMock.mockReturnValue({
      select: vi.fn().mockReturnValue(rows),
    });

    const { resolveConnectedAccountCredentials } = await import(
      "@/lib/operator/credentials/resolver"
    );

    await expect(
      resolveConnectedAccountCredentials({
        encryptionSecret: "local-dev-secret",
        organizationId: "org_1",
        provider: "gmail",
      }),
    ).resolves.toEqual({
      accessToken: "access-token",
      connectedAccountId: "account_gmail",
      expiresAt: undefined,
      externalAccountId: "google-account-1",
      externalAccountLabel: "owner@northline.test",
      grantedScopes: ["gmail.send"],
      provider: "gmail",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
  });

  it("returns null for accounts that require reconnect instead of using stale credentials", async () => {
    const rows = createSelectChain([
      {
        connectedAccountId: "account_gmail",
        externalAccountId: "google-account-1",
        externalAccountLabel: "owner@northline.test",
        grantedScopes: ["gmail.send"],
        provider: "gmail",
        status: "reconnect_required",
        encryptedPayload: null,
      },
    ]);

    getDbMock.mockReturnValue({
      select: vi.fn().mockReturnValue(rows),
    });

    const { resolveConnectedAccountCredentials } = await import(
      "@/lib/operator/credentials/resolver"
    );

    await expect(
      resolveConnectedAccountCredentials({
        encryptionSecret: "local-dev-secret",
        organizationId: "org_1",
        provider: "gmail",
      }),
    ).resolves.toBeNull();
  });
});
