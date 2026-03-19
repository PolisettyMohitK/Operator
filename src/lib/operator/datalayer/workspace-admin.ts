import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  channelStates,
  memberships,
  memoryProfiles,
  organizations,
} from "@/lib/operator/db/schema";

type TeamRole = "owner" | "staff" | "approver";
type DeliveryChannel = "web" | "email" | "whatsapp";

export type WorkspaceOwnerAccess = Readonly<{
  viewerOrganizationId: string;
  viewerRole: TeamRole;
  targetOrganizationId: string;
}>;

export type ReminderPolicy = Readonly<{
  urgentAfterDays: number;
  staleAfterDays: number;
  minimumSpacingDays: number;
}>;

export type WorkspaceChannelPolicy = Readonly<{
  channel: DeliveryChannel;
  state: string;
  note: string;
}>;

export type UpdateApprovalDelegationInput = Readonly<{
  actorMembershipId: string;
  organizationId: string;
  targetMembershipId: string;
  canApprove: boolean;
}>;

export type SaveWorkspacePolicyInput = Readonly<{
  actorMembershipId: string;
  organizationId: string;
  toneGuidance: string;
  reminderPolicy: ReminderPolicy;
  channelPolicies: WorkspaceChannelPolicy[];
}>;

type ChannelRow = {
  id: string;
  channel: DeliveryChannel;
  state: string;
  note: string;
};

type DatabaseClient = NonNullable<ReturnType<typeof getDb>>;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

const DEFAULT_CHANNEL_POLICIES: WorkspaceChannelPolicy[] = [
  {
    channel: "web",
    state: "Canonical",
    note: "Web remains the canonical queue, edit surface, and audit trail.",
  },
  {
    channel: "email",
    state: "Active",
    note: "Email carries signed approval links and deep-links into the queue.",
  },
  {
    channel: "whatsapp",
    state: "Action surface",
    note: "WhatsApp is reserved for fast approval actions and escalation pings.",
  },
];

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = {
  urgentAfterDays: 14,
  staleAfterDays: 30,
  minimumSpacingDays: 3,
};

function buildRecordId(prefix: string, value: string) {
  return `${prefix}_${value}_${crypto.randomUUID()}`.slice(0, 120);
}

function readString(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function readPositiveInteger(formData: FormData, field: string) {
  const value = Number.parseInt(readString(formData, field), 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive whole number.`);
  }

  return value;
}

export function assertWorkspaceOwnerAccess({
  viewerOrganizationId,
  viewerRole,
  targetOrganizationId,
}: WorkspaceOwnerAccess) {
  if (viewerRole !== "owner") {
    throw new Error("Only workspace owners can manage team delegation and policy.");
  }

  if (viewerOrganizationId !== targetOrganizationId) {
    throw new Error("Cannot administer a workspace outside the active workspace.");
  }
}

export function parseReminderPolicyFormData(formData: FormData): ReminderPolicy {
  const urgentAfterDays = readPositiveInteger(formData, "urgentAfterDays");
  const staleAfterDays = readPositiveInteger(formData, "staleAfterDays");
  const minimumSpacingDays = readPositiveInteger(formData, "minimumSpacingDays");

  if (staleAfterDays <= urgentAfterDays) {
    throw new Error("Stale threshold must be greater than the urgent threshold.");
  }

  return {
    urgentAfterDays,
    staleAfterDays,
    minimumSpacingDays,
  };
}

export function materializeChannelPolicyDefaults(
  existingPolicies: WorkspaceChannelPolicy[],
): WorkspaceChannelPolicy[] {
  const existingByChannel = new Map(
    existingPolicies.map((policy) => [policy.channel, policy]),
  );

  return DEFAULT_CHANNEL_POLICIES.map((policy) => {
    const existingPolicy = existingByChannel.get(policy.channel);

    if (!existingPolicy) {
      return policy;
    }

    return {
      channel: policy.channel,
      state: existingPolicy.state.trim() || policy.state,
      note: existingPolicy.note.trim() || policy.note,
    };
  });
}

export function parseChannelPolicyFormData(
  formData: FormData,
): WorkspaceChannelPolicy[] {
  return DEFAULT_CHANNEL_POLICIES.map((policy) => ({
    channel: policy.channel,
    state: readString(formData, `channel:${policy.channel}:state`),
    note: readString(formData, `channel:${policy.channel}:note`),
  }));
}

async function loadMembershipForAdmin(
  tx: DatabaseTransaction,
  membershipId: string,
) {
  const [row] = await tx
    .select({
      id: memberships.id,
      organizationId: memberships.organizationId,
      role: memberships.role,
      displayName: memberships.displayName,
      canApprove: memberships.canApprove,
    })
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .limit(1);

  return row ?? null;
}

export async function updateMemberApprovalDelegation({
  actorMembershipId,
  organizationId,
  targetMembershipId,
  canApprove,
}: UpdateApprovalDelegationInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db.transaction(async (tx) => {
    const actor = await loadMembershipForAdmin(tx, actorMembershipId);

    if (!actor) {
      throw new Error("Owner membership not found.");
    }

    assertWorkspaceOwnerAccess({
      viewerOrganizationId: actor.organizationId,
      viewerRole: actor.role,
      targetOrganizationId: organizationId,
    });

    const target = await loadMembershipForAdmin(tx, targetMembershipId);

    if (!target || target.organizationId !== organizationId) {
      throw new Error("Target membership not found.");
    }

    if (target.role !== "staff") {
      throw new Error("Only staff memberships can be delegated through this control.");
    }

    await tx
      .update(memberships)
      .set({
        canApprove,
      })
      .where(
        and(
          eq(memberships.id, targetMembershipId),
          eq(memberships.organizationId, organizationId),
        ),
      );

    await tx.insert(activityLogs).values({
      id: buildRecordId("activity", targetMembershipId),
      actorMembershipId,
      organizationId,
      subjectType: "membership",
      subjectId: targetMembershipId,
      title: "Approval delegation updated",
      message: canApprove
        ? `${actor.displayName} delegated approval authority to ${target.displayName}.`
        : `${actor.displayName} removed approval authority from ${target.displayName}.`,
      metadata: {
        actorName: actor.displayName,
        memberName: target.displayName,
        canApprove,
      },
    });

    return {
      memberName: target.displayName,
      role: target.role,
      canApprove,
    };
  });
}

export async function saveWorkspacePolicy({
  actorMembershipId,
  organizationId,
  toneGuidance,
  reminderPolicy,
  channelPolicies,
}: SaveWorkspacePolicyInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const trimmedToneGuidance = toneGuidance.trim();

  if (!trimmedToneGuidance) {
    throw new Error("Tone guidance is required.");
  }

  if (channelPolicies.length === 0) {
    throw new Error("At least one channel policy is required.");
  }

  return db.transaction(async (tx) => {
    const actor = await loadMembershipForAdmin(tx, actorMembershipId);

    if (!actor) {
      throw new Error("Owner membership not found.");
    }

    assertWorkspaceOwnerAccess({
      viewerOrganizationId: actor.organizationId,
      viewerRole: actor.role,
      targetOrganizationId: organizationId,
    });

    await tx
      .update(organizations)
      .set({
        toneGuidance: trimmedToneGuidance,
      })
      .where(eq(organizations.id, organizationId));

    const [existingMemoryProfile] = await tx
      .select({
        id: memoryProfiles.id,
      })
      .from(memoryProfiles)
      .where(eq(memoryProfiles.organizationId, organizationId))
      .limit(1);

    if (existingMemoryProfile) {
      await tx
        .update(memoryProfiles)
        .set({
          communicationTone: trimmedToneGuidance,
          reminderPolicy,
          updatedAt: new Date(),
        })
        .where(eq(memoryProfiles.id, existingMemoryProfile.id));
    } else {
      await tx.insert(memoryProfiles).values({
        id: buildRecordId("memory", organizationId),
        organizationId,
        communicationTone: trimmedToneGuidance,
        reminderPolicy,
        clientExceptions: {},
        updatedAt: new Date(),
      });
    }

    const existingChannelRows = (await tx
      .select({
        id: channelStates.id,
        channel: channelStates.channel,
        state: channelStates.state,
        note: channelStates.note,
      })
      .from(channelStates)
      .where(eq(channelStates.organizationId, organizationId))) as ChannelRow[];

    const existingChannelsByKey = new Map(
      existingChannelRows.map((row) => [row.channel, row]),
    );

    for (const policy of channelPolicies) {
      const existingChannel = existingChannelsByKey.get(policy.channel);

      if (existingChannel) {
        await tx
          .update(channelStates)
          .set({
            state: policy.state.trim(),
            note: policy.note.trim(),
          })
          .where(eq(channelStates.id, existingChannel.id));
      } else {
        await tx.insert(channelStates).values({
          id: buildRecordId("channel", `${organizationId}_${policy.channel}`),
          organizationId,
          channel: policy.channel,
          state: policy.state.trim(),
          note: policy.note.trim(),
        });
      }
    }

    await tx.insert(activityLogs).values({
      id: buildRecordId("activity", organizationId),
      actorMembershipId,
      organizationId,
      subjectType: "workspace_policy",
      subjectId: organizationId,
      title: "Workspace policy updated",
      message: `${actor.displayName} updated tone guidance, reminder cadence, and channel policy.`,
      metadata: {
        actorName: actor.displayName,
        toneGuidance: trimmedToneGuidance,
        reminderPolicy,
        channels: channelPolicies.map((policy) => policy.channel),
      },
    });
  });
}
