import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveConnectedAccountCredentialsMock = vi.fn();

vi.mock("@/lib/operator/credentials/resolver", () => ({
  resolveConnectedAccountCredentials: resolveConnectedAccountCredentialsMock,
}));

describe("getGoogleSheetsAdapterForOrganization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("google_sheets_adapter_uses_resolved_org_credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        values: [
          ["Invoice Number", "Outstanding"],
          ["INV-201", "4800"],
        ],
      }),
    });

    resolveConnectedAccountCredentialsMock.mockResolvedValue({
      accessToken: "organization-token",
      connectedAccountId: "sheets_account_1",
      externalAccountId: "google-account-1",
      externalAccountLabel: "ops@northline.test",
      grantedScopes: ["spreadsheets.readonly"],
      provider: "google_sheets",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });

    const { getGoogleSheetsAdapterForOrganization } = await import(
      "@/lib/operator/adapters/google-sheets"
    );

    const adapter = await getGoogleSheetsAdapterForOrganization({
      organizationId: "org_northline",
      env: {
        OPERATOR_ENCRYPTION_KEY: "local-dev-secret",
      },
      fetchImpl,
    });

    await expect(
      adapter.fetchRows({
        range: "Invoices!A:B",
        spreadsheetId: "sheet_123",
      }),
    ).resolves.toEqual([
      {
        "Invoice Number": "INV-201",
        Outstanding: "4800",
      },
    ]);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("https://sheets.googleapis.com/v4/spreadsheets"),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer organization-token",
        },
      }),
    );
  });
});
