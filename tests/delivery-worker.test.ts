import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();
const getGmailAdapterForOrganizationMock = vi.fn();
const resolveWorkspaceEntitlementsMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/operator/adapters/gmail", () => ({
  GmailAdapterNotConfiguredError: class GmailAdapterNotConfiguredError extends Error {},
  GmailSendDraftError: class GmailSendDraftError extends Error {
    retryable: boolean;

    constructor(message: string, retryable = false) {
      super(message);
      this.retryable = retryable;
    }
  },
  getGmailAdapterForOrganization: getGmailAdapterForOrganizationMock,
}));

vi.mock("@/lib/operator/billing/entitlements", () => ({
  resolveWorkspaceEntitlements: resolveWorkspaceEntitlementsMock,
  assertInvoiceRecoveryExecutionAllowed: vi.fn(),
}));

function createReadChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function createInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processQueuedApprovalDeliveries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("sends queued Gmail deliveries and marks the approval item as sent", async () => {
    const queuedRows = createReadChain([
      {
        approvalItemId: "approval_1",
        approvalStatus: "approved",
        channel: "email",
        clientEmail: "finance@northline.test",
        clientName: "Northline Studio",
        draftContent: "Draft body",
        invoiceCode: "INV-201",
        metadata: {
          retryCount: 0,
        },
        organizationId: "org_northline",
        attemptId: "delivery_1",
      },
    ]);
    const updateAttempt = createUpdateChain();
    const updateApproval = createUpdateChain();
    const insertActivity = createInsertChain();

    getDbMock.mockReturnValue({
      select: vi.fn().mockReturnValue(queuedRows),
      update: vi.fn().mockReturnValueOnce(updateAttempt).mockReturnValueOnce(updateApproval),
      insert: vi.fn().mockReturnValue(insertActivity),
    });
    resolveWorkspaceEntitlementsMock.mockResolvedValue({
      canRunBackgroundExecution: true,
    });
    getGmailAdapterForOrganizationMock.mockResolvedValue({
      sendDraft: vi.fn().mockResolvedValue({
        providerMessageId: "gmail-provider-id",
      }),
    });

    const { processQueuedApprovalDeliveries } = await import(
      "@/lib/operator/delivery/worker"
    );

    await expect(
      processQueuedApprovalDeliveries({
        organizationId: "org_northline",
      }),
    ).resolves.toEqual({
      failed: 0,
      paused: 0,
      processed: 1,
      queuedForRetry: 0,
      sent: 1,
    });

    expect(updateAttempt.set).toHaveBeenCalledWith(
      expect.objectContaining({
        providerReference: "gmail-provider-id",
        state: "sent",
      }),
    );
    expect(updateApproval.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
      }),
    );
  });

  it("pauses queued sends when the workspace is not entitled to run background execution", async () => {
    const queuedRows = createReadChain([
      {
        approvalItemId: "approval_1",
        approvalStatus: "approved",
        channel: "email",
        clientEmail: "finance@northline.test",
        clientName: "Northline Studio",
        draftContent: "Draft body",
        invoiceCode: "INV-201",
        metadata: {
          retryCount: 0,
        },
        organizationId: "org_paused",
        attemptId: "delivery_1",
      },
    ]);
    const updateAttempt = createUpdateChain();
    const insertActivity = createInsertChain();

    getDbMock.mockReturnValue({
      select: vi.fn().mockReturnValue(queuedRows),
      update: vi.fn().mockReturnValue(updateAttempt),
      insert: vi.fn().mockReturnValue(insertActivity),
    });
    resolveWorkspaceEntitlementsMock.mockResolvedValue({
      canRunBackgroundExecution: false,
    });

    const { processQueuedApprovalDeliveries } = await import(
      "@/lib/operator/delivery/worker"
    );

    await expect(
      processQueuedApprovalDeliveries({
        organizationId: "org_paused",
      }),
    ).resolves.toEqual({
      failed: 0,
      paused: 1,
      processed: 1,
      queuedForRetry: 0,
      sent: 0,
    });

    expect(updateAttempt.set).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "paused",
      }),
    );
    expect(getGmailAdapterForOrganizationMock).not.toHaveBeenCalled();
  });
});
