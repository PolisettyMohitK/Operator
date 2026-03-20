import { beforeEach, describe, expect, it, vi } from "vitest";

const requireViewerContextMock = vi.fn();
const getDbMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/operator/datalayer/viewer-context", () => ({
  requireViewerContext: requireViewerContextMock,
}));

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function createDeleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function createInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

describe("disconnectConnectedAccount", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("disconnect_marks_account_disconnected_without_losing_audit_state", async () => {
    const accountUpdate = createUpdateChain();
    const tokenDelete = createDeleteChain();
    const activityInsert = createInsertChain();
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "connected_gmail_1",
          organizationId: "org_test",
          provider: "gmail",
        },
      ]),
    };
    const tx = {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(accountUpdate),
      delete: vi.fn().mockReturnValue(tokenDelete),
      insert: vi.fn().mockReturnValue(activityInsert),
    };

    requireViewerContextMock.mockResolvedValue({
      businessName: "Northline Advisory",
      membershipId: "membership_1",
      organizationId: "org_test",
      role: "owner",
    });
    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback) => callback(tx)),
    });

    const { disconnectConnectedAccount } = await import(
      "@/app/actions/integrations"
    );

    await disconnectConnectedAccount("gmail");

    expect(accountUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        reconnectReason: expect.stringContaining("Disconnected"),
        status: "disconnected",
      }),
    );
    expect(tokenDelete.where).toHaveBeenCalledOnce();
    expect(activityInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_1",
        organizationId: "org_test",
        subjectType: "connected_account",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/integrations");
  });
});
