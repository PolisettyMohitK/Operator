import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultAgentPolicy } from "@/lib/operator/policy/defaults";

const getDbMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function createInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

describe("persistWorkspaceAgentPolicy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates the first agent policy row, snapshot, and sync run together", async () => {
    const selectRows = createSelectChain([]);
    const insertAgentPolicy = createInsertChain();
    const insertSnapshot = createInsertChain();
    const insertSyncRun = createInsertChain();
    const tx = {
      select: vi.fn().mockReturnValue(selectRows),
      insert: vi
        .fn()
        .mockReturnValueOnce(insertAgentPolicy)
        .mockReturnValueOnce(insertSnapshot)
        .mockReturnValueOnce(insertSyncRun),
      update: vi.fn(),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    });

    const { persistWorkspaceAgentPolicy } = await import(
      "@/lib/operator/policy/service"
    );
    const policy = createDefaultAgentPolicy({
      toneGuidance: "Calm and commercially clear.",
      workspaceLabel: "Northline Advisory",
    });

    await expect(
      persistWorkspaceAgentPolicy({
        actorMembershipId: "membership_owner",
        organizationId: "org_1",
        policy,
        runtimeClient: {
          applyPolicy: async () => ({
            ok: true,
          }),
          fetchRuntimeState: async () => ({
            ok: true,
            runtime: {
              deliveryChannels: {
                email: true,
                web: true,
              },
              executionPolicy: "require-approval",
              toolPermissions: {
                gmailSend: true,
                googleSheetsRead: true,
              },
              workspaceLabel: "Northline Advisory",
            },
          }),
        },
      }),
    ).resolves.toEqual({
      policyVersion: 1,
      runtimeStatus: "healthy",
    });

    expect(insertAgentPolicy.values).toHaveBeenCalledWith(
      expect.objectContaining({
        desiredPolicyVersion: 1,
        organizationId: "org_1",
        runtimeStatus: "healthy",
      }),
    );
    expect(insertSnapshot.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_owner",
        organizationId: "org_1",
        policyVersion: 1,
      }),
    );
    expect(insertSyncRun.values).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "OpenClaw policy reconcile completed successfully.",
        kind: "policy_reconcile",
        organizationId: "org_1",
        status: "succeeded",
      }),
    );
  });

  it("increments the policy version when updating an existing policy", async () => {
    const existingPolicyRows = createSelectChain([
      {
        id: "policy_org_1",
        desiredPolicyVersion: 1,
        desiredPolicy: createDefaultAgentPolicy({
          toneGuidance: "Calm and commercially clear.",
          workspaceLabel: "Northline Advisory",
        }),
      },
    ]);
    const updateAgentPolicy = createUpdateChain();
    const insertSnapshot = createInsertChain();
    const insertSyncRun = createInsertChain();
    const tx = {
      select: vi.fn().mockReturnValue(existingPolicyRows),
      insert: vi
        .fn()
        .mockReturnValueOnce(insertSnapshot)
        .mockReturnValueOnce(insertSyncRun),
      update: vi.fn().mockReturnValue(updateAgentPolicy),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    });

    const { persistWorkspaceAgentPolicy } = await import(
      "@/lib/operator/policy/service"
    );
    const policy = {
      ...createDefaultAgentPolicy({
        toneGuidance: "Calm and commercially clear.",
        workspaceLabel: "Northline Advisory",
      }),
      automation: {
        killSwitch: true,
        paused: false,
      },
    };

    await persistWorkspaceAgentPolicy({
      actorMembershipId: "membership_owner",
      organizationId: "org_1",
      policy,
      runtimeClient: {
        applyPolicy: async () => ({
          ok: true,
        }),
        fetchRuntimeState: async () => ({
          ok: true,
          runtime: {
            deliveryChannels: {
              email: true,
              web: true,
            },
            executionPolicy: "paused",
            toolPermissions: {
              gmailSend: false,
              googleSheetsRead: false,
            },
            workspaceLabel: "Northline Advisory",
          },
        }),
      },
    });

    expect(updateAgentPolicy.set).toHaveBeenCalledWith(
      expect.objectContaining({
        desiredPolicyVersion: 2,
        runtimeStatus: "healthy",
      }),
    );
    expect(insertSnapshot.values).toHaveBeenCalledWith(
      expect.objectContaining({
        policyVersion: 2,
      }),
    );
  });
});
