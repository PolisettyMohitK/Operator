import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveConnectedAccountCredentialsMock = vi.fn();
const getOperatorGmailSenderMock = vi.fn();

vi.mock("@/lib/operator/credentials/resolver", () => ({
  resolveConnectedAccountCredentials: resolveConnectedAccountCredentialsMock,
}));

vi.mock("@/lib/operator/integrations/env", async () => {
  const actual = await vi.importActual("@/lib/operator/integrations/env");

  return {
    ...actual,
    getOperatorGmailSender: getOperatorGmailSenderMock,
  };
});

describe("getGmailAdapterForOrganization", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getOperatorGmailSenderMock.mockReturnValue("sender@operator.test");
  });

  it("sends through Gmail using organization-scoped credentials", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "gmail-message-1",
      }),
    });

    resolveConnectedAccountCredentialsMock.mockResolvedValue({
      accessToken: "organization-token",
      connectedAccountId: "gmail_account_1",
      externalAccountId: "google-account-1",
      externalAccountLabel: "collections@northline.test",
      grantedScopes: ["gmail.send"],
      provider: "gmail",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });

    const { getGmailAdapterForOrganization } = await import(
      "@/lib/operator/adapters/gmail"
    );

    const adapter = await getGmailAdapterForOrganization({
      organizationId: "org_northline",
      env: {
        OPERATOR_ENCRYPTION_KEY: "local-dev-secret",
        OPERATOR_GMAIL_SENDER: "sender@operator.test",
      },
      fetchImpl,
    });

    await expect(
      adapter.sendDraft({
        body: "Hello from Operator",
        recipient: "client@northline.test",
        subject: "Invoice reminder",
      }),
    ).resolves.toEqual({
      providerMessageId: "gmail-message-1",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer organization-token",
        }),
      }),
    );
  });

  it("throws when the organization does not have a connected Gmail account", async () => {
    resolveConnectedAccountCredentialsMock.mockResolvedValue(null);

    const { getGmailAdapterForOrganization, GmailAdapterNotConfiguredError } =
      await import("@/lib/operator/adapters/gmail");

    await expect(
      getGmailAdapterForOrganization({
        organizationId: "org_missing",
        env: {
          OPERATOR_ENCRYPTION_KEY: "local-dev-secret",
          OPERATOR_GMAIL_SENDER: "sender@operator.test",
        },
      }),
    ).rejects.toBeInstanceOf(GmailAdapterNotConfiguredError);
  });
});
