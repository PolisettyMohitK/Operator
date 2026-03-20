import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createLimitSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function createCollectionSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

describe("resolveWorkspaceEntitlements", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("enables core invoice recovery execution only for active, trialing workspaces with the feature gate", async () => {
    const organizationSelect = createLimitSelectChain([
      {
        status: "active",
      },
    ]);
    const subscriptionSelect = createLimitSelectChain([
      {
        plan: "trial",
        status: "trialing",
      },
    ]);
    const featureGateSelect = createCollectionSelectChain([
      {
        key: "invoice_recovery",
        enabled: true,
      },
      {
        key: "advanced_runtime",
        enabled: false,
      },
    ]);

    getDbMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(organizationSelect)
        .mockReturnValueOnce(subscriptionSelect)
        .mockReturnValueOnce(featureGateSelect),
    });

    const { resolveWorkspaceEntitlements } = await import(
      "@/lib/operator/billing/entitlements"
    );

    await expect(
      resolveWorkspaceEntitlements("org_northline"),
    ).resolves.toEqual({
      advancedRuntimeEnabled: false,
      canAccessCoreProduct: true,
      canRunBackgroundExecution: true,
      invoiceRecoveryEnabled: true,
      organizationId: "org_northline",
      plan: "trial",
      subscriptionStatus: "trialing",
      workspaceStatus: "active",
    });
  });

  it("fails closed when the workspace is paused or the invoice recovery gate is disabled", async () => {
    const organizationSelect = createLimitSelectChain([
      {
        status: "paused",
      },
    ]);
    const subscriptionSelect = createLimitSelectChain([
      {
        plan: "personal",
        status: "active",
      },
    ]);
    const featureGateSelect = createCollectionSelectChain([
      {
        key: "invoice_recovery",
        enabled: false,
      },
    ]);

    getDbMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(organizationSelect)
        .mockReturnValueOnce(subscriptionSelect)
        .mockReturnValueOnce(featureGateSelect),
    });

    const { assertInvoiceRecoveryExecutionAllowed, resolveWorkspaceEntitlements } =
      await import("@/lib/operator/billing/entitlements");

    const entitlements = await resolveWorkspaceEntitlements("org_paused");

    expect(entitlements.canAccessCoreProduct).toBe(false);
    expect(entitlements.canRunBackgroundExecution).toBe(false);
    expect(() => assertInvoiceRecoveryExecutionAllowed(entitlements)).toThrow(
      "Workspace is not currently entitled",
    );
  });
});
