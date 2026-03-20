import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();
const persistWorkspaceAgentPolicyMock = vi.fn();
const getOpenClawRuntimeClientMock = vi.fn();
const createUnavailableRuntimeClientMock = vi.fn(() => ({
  applyPolicy: vi.fn(),
  fetchRuntimeState: vi.fn(),
}));

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/operator/policy/service", () => ({
  persistWorkspaceAgentPolicy: persistWorkspaceAgentPolicyMock,
}));

vi.mock("@/lib/operator/runtime/openclaw-runtime-client", () => ({
  getOpenClawRuntimeClient: getOpenClawRuntimeClientMock,
}));

vi.mock("@/lib/operator/runtime/runtime-manager", () => ({
  createUnavailableRuntimeClient: createUnavailableRuntimeClientMock,
}));

function createSelectChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
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
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("workspace admin access", () => {
  it("allows owners to administer their own workspace", async () => {
    const { assertWorkspaceOwnerAccess } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );

    expect(() =>
      assertWorkspaceOwnerAccess({
        viewerOrganizationId: "org_1",
        viewerRole: "owner",
        targetOrganizationId: "org_1",
      }),
    ).not.toThrow();
  });

  it("blocks non-owners and cross-workspace admin actions", async () => {
    const { assertWorkspaceOwnerAccess } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );

    expect(() =>
      assertWorkspaceOwnerAccess({
        viewerOrganizationId: "org_1",
        viewerRole: "staff",
        targetOrganizationId: "org_1",
      }),
    ).toThrow("Only workspace owners");

    expect(() =>
      assertWorkspaceOwnerAccess({
        viewerOrganizationId: "org_1",
        viewerRole: "owner",
        targetOrganizationId: "org_2",
      }),
    ).toThrow("outside the active workspace");
  });
});

describe("parseReminderPolicyFormData", () => {
  it("parses valid reminder cadence values", async () => {
    const { parseReminderPolicyFormData } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );
    const formData = new FormData();
    formData.set("urgentAfterDays", "7");
    formData.set("staleAfterDays", "21");
    formData.set("minimumSpacingDays", "3");

    expect(parseReminderPolicyFormData(formData)).toEqual({
      minimumSpacingDays: 3,
      staleAfterDays: 21,
      urgentAfterDays: 7,
    });
  });

  it("rejects invalid reminder cadence values", async () => {
    const { parseReminderPolicyFormData } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );
    const formData = new FormData();
    formData.set("urgentAfterDays", "12");
    formData.set("staleAfterDays", "8");
    formData.set("minimumSpacingDays", "2");

    expect(() => parseReminderPolicyFormData(formData)).toThrow(
      "Stale threshold must be greater than the urgent threshold.",
    );
  });
});

describe("channel policy helpers", () => {
  it("materializes all supported channels in a stable order", async () => {
    const { materializeChannelPolicyDefaults } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );

    expect(
      materializeChannelPolicyDefaults([
        {
          channel: "email",
          note: "Email approvals",
          state: "Active",
        },
      ]),
    ).toEqual([
      {
        channel: "web",
        note: expect.any(String),
        state: "Canonical",
      },
      {
        channel: "email",
        note: "Email approvals",
        state: "Active",
      },
    ]);
  });

  it("parses channel policy edits from form data", async () => {
    const { parseChannelPolicyFormData } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );
    const formData = new FormData();
    formData.set("channel:web:state", "Canonical");
    formData.set("channel:web:note", "Web is the canonical queue.");
    formData.set("channel:email:state", "Active");
    formData.set("channel:email:note", "Email is used for signatures.");

    expect(parseChannelPolicyFormData(formData)).toEqual([
      {
        channel: "web",
        note: "Web is the canonical queue.",
        state: "Canonical",
      },
      {
        channel: "email",
        note: "Email is used for signatures.",
        state: "Active",
      },
    ]);
  });
});

describe("updateMemberApprovalDelegation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getOpenClawRuntimeClientMock.mockReturnValue(null);
  });

  it("updates a staff member's approval delegation and logs the change", async () => {
    const actorMembershipRows = createSelectChain([
      {
        id: "membership_owner",
        organizationId: "org_1",
        role: "owner",
        displayName: "Aarav",
        canApprove: true,
      },
    ]);
    const targetMembershipRows = createSelectChain([
      {
        id: "membership_staff",
        organizationId: "org_1",
        role: "staff",
        displayName: "Mina",
        canApprove: false,
      },
    ]);
    const updateMembership = createUpdateChain();
    const insertActivity = createInsertChain();
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(actorMembershipRows)
        .mockReturnValueOnce(targetMembershipRows),
      update: vi.fn().mockReturnValue(updateMembership),
      insert: vi.fn().mockReturnValue(insertActivity),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    });

    const { updateMemberApprovalDelegation } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );

    const result = await updateMemberApprovalDelegation({
      actorMembershipId: "membership_owner",
      canApprove: true,
      organizationId: "org_1",
      targetMembershipId: "membership_staff",
    });

    expect(result).toEqual({
      canApprove: true,
      memberName: "Mina",
      role: "staff",
    });
    expect(updateMembership.set).toHaveBeenCalledWith({
      canApprove: true,
    });
    expect(insertActivity.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_owner",
        organizationId: "org_1",
        subjectType: "membership",
        subjectId: "membership_staff",
        title: "Approval delegation updated",
      }),
    );
  });
});

describe("saveWorkspacePolicy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getOpenClawRuntimeClientMock.mockReturnValue(null);
  });

  it("persists tone guidance, reminder cadence, and channel policy in one transaction", async () => {
    const actorMembershipRows = createSelectChain([
      {
        id: "membership_owner",
        organizationId: "org_1",
        role: "owner",
        displayName: "Aarav",
        canApprove: true,
      },
    ]);
    const memoryProfileRows = createSelectChain([
      {
        id: "memory_org_1",
      },
    ]);
    const channelStateRows = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: "channel_email_org_1",
          channel: "email",
          state: "Active",
          note: "Old note",
        },
      ]),
    };
    const updateOrganizations = createUpdateChain();
    const updateMemory = createUpdateChain();
    const updateChannels = createUpdateChain();
    const insertChannel = createInsertChain();
    const insertActivity = createInsertChain();
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(actorMembershipRows)
        .mockReturnValueOnce(memoryProfileRows)
        .mockReturnValueOnce(channelStateRows)
        .mockReturnValueOnce(createSelectChain([])),
      update: vi
        .fn()
        .mockReturnValueOnce(updateOrganizations)
        .mockReturnValueOnce(updateMemory)
        .mockReturnValue(updateChannels),
      insert: vi
        .fn()
        .mockReturnValueOnce(insertChannel)
        .mockReturnValueOnce(insertActivity),
    };

    getDbMock.mockReturnValue({
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    });

    const { saveWorkspacePolicy } = await import(
      "@/lib/operator/datalayer/workspace-admin"
    );

    await saveWorkspacePolicy({
      actorMembershipId: "membership_owner",
      channelPolicies: [
        {
          channel: "web",
          note: "Dashboard remains canonical.",
          state: "Canonical",
        },
        {
          channel: "email",
          note: "Email is used for approvals.",
          state: "Active",
        },
      ],
      gmailSendEnabled: true,
      googleSheetsReadEnabled: true,
      killSwitchEnabled: false,
      workspaceLabel: "Northline Advisory",
      organizationId: "org_1",
      reminderPolicy: {
        minimumSpacingDays: 3,
        staleAfterDays: 21,
        urgentAfterDays: 7,
      },
      toneGuidance: "Direct, calm, respectful, and commercially clear.",
    });

    expect(updateOrganizations.set).toHaveBeenCalledWith({
      toneGuidance: "Direct, calm, respectful, and commercially clear.",
    });
    expect(updateMemory.set).toHaveBeenCalledWith({
      communicationTone: "Direct, calm, respectful, and commercially clear.",
      reminderPolicy: {
        minimumSpacingDays: 3,
        staleAfterDays: 21,
        urgentAfterDays: 7,
      },
      updatedAt: expect.any(Date),
    });
    expect(insertChannel.values).toHaveBeenCalledTimes(1);
    expect(insertActivity.values).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_owner",
        organizationId: "org_1",
        subjectType: "workspace_policy",
        title: "Workspace policy updated",
      }),
    );
    expect(persistWorkspaceAgentPolicyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorMembershipId: "membership_owner",
        organizationId: "org_1",
        policy: expect.objectContaining({
          tools: {
            gmailSend: true,
            googleSheetsRead: true,
          },
          automation: {
            killSwitch: false,
            paused: false,
          },
          workspaceLabel: "Northline Advisory",
        }),
        tx,
      }),
    );
  });
});
