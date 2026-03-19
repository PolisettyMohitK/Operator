import type { WebhookEvent } from "@clerk/backend";

import { mapClerkRoleToTeamRole } from "@/lib/auth/clerk";
import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  memberships,
  organizations,
} from "@/lib/operator/db/schema";

const DEFAULT_BUSINESS_TYPE = "Independent business";
const DEFAULT_TONE_GUIDANCE =
  "Direct, calm, respectful, and firm when an invoice is genuinely overdue.";

type Database = NonNullable<ReturnType<typeof getDb>>;
type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type UserCreatedEvent = Readonly<{
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email_addresses: Array<{
      email_address: string;
    }>;
  };
}>;
type OrganizationMembershipEvent = Readonly<{
  data: {
    id: string;
    role?: string | null;
    public_metadata?: Record<string, unknown> | null;
    organization: {
      id: string;
      name: string;
      slug?: string | null;
    };
    public_user_data: {
      user_id: string;
      first_name?: string | null;
      last_name?: string | null;
      identifier?: string | null;
    };
  };
}>;

function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "workspace";
}

function clampIdentifier(prefix: string, value: string, limit = 120) {
  return `${prefix}_${slugifySegment(value)}`.slice(0, limit);
}

function pickDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
  fallback?: string | null;
}) {
  const displayName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return displayName || input.fallback || "Operator member";
}

function mapWebhookApprovalFlag(input: {
  clerkRole?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (input.clerkRole === "org:admin") {
    return true;
  }

  return input.metadata?.can_approve === true || input.metadata?.canApprove === true;
}

async function upsertOrganization(
  tx: DatabaseTransaction,
  input: {
    id: string;
    clerkOrganizationId: string | null;
    workspaceLabel: string;
    name: string;
    ownerName: string;
  },
) {
  await tx
    .insert(organizations)
    .values({
      id: input.id,
      clerkOrganizationId: input.clerkOrganizationId,
      workspaceLabel: input.workspaceLabel,
      name: input.name,
      businessType: DEFAULT_BUSINESS_TYPE,
      ownerName: input.ownerName,
      toneGuidance: DEFAULT_TONE_GUIDANCE,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        clerkOrganizationId: input.clerkOrganizationId,
        workspaceLabel: input.workspaceLabel,
        name: input.name,
        ownerName: input.ownerName,
      },
    });
}

async function upsertMembership(
  tx: DatabaseTransaction,
  input: {
    organizationId: string;
    clerkUserId: string;
    displayName: string;
    role: "owner" | "staff" | "approver";
    canApprove: boolean;
  },
) {
  await tx
    .insert(memberships)
    .values({
      id: clampIdentifier(
        "membership",
        `${input.organizationId}_${input.clerkUserId}`,
      ),
      organizationId: input.organizationId,
      clerkUserId: input.clerkUserId,
      displayName: input.displayName,
      role: input.role,
      canApprove: input.canApprove,
    })
    .onConflictDoUpdate({
      target: [memberships.organizationId, memberships.clerkUserId],
      set: {
        displayName: input.displayName,
        role: input.role,
        canApprove: input.canApprove,
      },
    });
}

async function logMembershipDeletion(
  tx: DatabaseTransaction,
  input: {
    organizationId: string;
    clerkUserId: string;
    membershipId: string;
  },
) {
  await tx.insert(activityLogs).values({
    id: clampIdentifier(
      "activity",
      `${input.organizationId}_${input.membershipId}_${Date.now()}`,
    ),
    organizationId: input.organizationId,
    actorMembershipId: null,
    subjectType: "clerk_webhook",
    subjectId: input.membershipId,
    title: "Organization membership removed in Clerk",
    message: `Clerk reported that ${input.clerkUserId} was removed from the organization. The local membership row was retained for audit history.`,
    metadata: {
      channel: "Web",
      clerkUserId: input.clerkUserId,
      membershipId: input.membershipId,
    },
  });
}

async function handleUserCreated(
  tx: DatabaseTransaction,
  event: UserCreatedEvent,
) {
  const displayName = pickDisplayName({
    firstName: event.data.first_name,
    lastName: event.data.last_name,
    fallback: event.data.email_addresses[0]?.email_address ?? event.data.username,
  });
  const organizationId = clampIdentifier("org", `user_${event.data.id}`);

  await upsertOrganization(tx, {
    id: organizationId,
    clerkOrganizationId: null,
    workspaceLabel: "Operator Workspace",
    name: `${displayName}'s Workspace`,
    ownerName: displayName,
  });
  await upsertMembership(tx, {
    organizationId,
    clerkUserId: event.data.id,
    displayName,
    role: "staff",
    canApprove: false,
  });
}

async function handleOrganizationMembershipCreated(
  tx: DatabaseTransaction,
  event: OrganizationMembershipEvent,
) {
  const displayName = pickDisplayName({
    firstName: event.data.public_user_data.first_name,
    lastName: event.data.public_user_data.last_name,
    fallback: event.data.public_user_data.identifier,
  });
  const organizationId = clampIdentifier("org", event.data.organization.id);
  const mappedRole = mapClerkRoleToTeamRole(event.data.role);
  const canApprove = mapWebhookApprovalFlag({
    clerkRole: event.data.role,
    metadata: event.data.public_metadata as Record<string, unknown> | null,
  });

  await upsertOrganization(tx, {
    id: organizationId,
    clerkOrganizationId: event.data.organization.id,
    workspaceLabel:
      event.data.organization.slug ?? event.data.organization.name,
    name: event.data.organization.name,
    ownerName: displayName,
  });
  await upsertMembership(tx, {
    organizationId,
    clerkUserId: event.data.public_user_data.user_id,
    displayName,
    role: mappedRole,
    canApprove,
  });
}

async function handleOrganizationMembershipDeleted(
  tx: DatabaseTransaction,
  event: OrganizationMembershipEvent,
) {
  await logMembershipDeletion(tx, {
    organizationId: clampIdentifier("org", event.data.organization.id),
    clerkUserId: event.data.public_user_data.user_id,
    membershipId: event.data.id,
  });
}

export async function processClerkWebhookEvent(event: WebhookEvent) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db.transaction(async (tx) => {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(tx, event as UserCreatedEvent);
        break;
      case "organizationMembership.created":
        await handleOrganizationMembershipCreated(
          tx,
          event as OrganizationMembershipEvent,
        );
        break;
      case "organizationMembership.deleted":
        await handleOrganizationMembershipDeleted(
          tx,
          event as OrganizationMembershipEvent,
        );
        break;
      default:
        break;
    }
  });
}
