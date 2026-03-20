import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import { mapClerkRoleToTeamRole } from "@/lib/auth/clerk";
import { getDb } from "@/lib/operator/db/client";
import { memberships, organizations } from "@/lib/operator/db/schema";

type TeamRole = "owner" | "staff" | "approver";

const DEFAULT_BUSINESS_TYPE = "Independent business";
const DEFAULT_TONE_GUIDANCE =
  "Direct, calm, respectful, and firm when an invoice is genuinely overdue.";

export type SeedWorkspaceClaimState = Readonly<{
  nodeEnv?: string;
  organizationCount: number;
  seededMembershipCount: number;
  realMembershipCount: number;
}>;

export function allowsImplicitWorkspaceProvisioning(nodeEnv?: string) {
  return nodeEnv === "development" || nodeEnv === "test";
}

export function shouldAutoClaimSeedWorkspace({
  nodeEnv,
  organizationCount,
  seededMembershipCount,
  realMembershipCount,
}: SeedWorkspaceClaimState) {
  return (
    allowsImplicitWorkspaceProvisioning(nodeEnv) &&
    organizationCount === 1 &&
    seededMembershipCount > 0 &&
    realMembershipCount === 0
  );
}

export type ApprovalMutationAccess = Readonly<{
  viewerOrganizationId: string;
  viewerCanApprove: boolean;
  targetOrganizationId: string;
}>;

export function assertApprovalMutationAccess({
  viewerOrganizationId,
  viewerCanApprove,
  targetOrganizationId,
}: ApprovalMutationAccess) {
  if (!viewerCanApprove) {
    throw new Error("Viewer is not allowed to approve outbound messages.");
  }

  if (viewerOrganizationId !== targetOrganizationId) {
    throw new Error("Cannot mutate approval items outside the active workspace.");
  }
}

export type ViewerContext = Readonly<{
  userId: string;
  membershipId: string;
  organizationId: string;
  workspaceLabel: string;
  businessName: string;
  ownerName: string;
  toneGuidance: string;
  role: TeamRole;
  canApprove: boolean;
}>;

type OrganizationContextRow = {
  membershipId: string;
  organizationId: string;
  workspaceLabel: string;
  businessName: string;
  ownerName: string;
  toneGuidance: string;
  role: TeamRole;
  canApprove: boolean;
};

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

function pickDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  if (name) {
    return name;
  }

  return (
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "Operator owner"
  );
}

function resolveMembershipRole(
  existingRole: TeamRole | null,
  requestedRole: TeamRole,
) {
  if (existingRole === "approver") {
    return "approver" as const;
  }

  return requestedRole;
}

async function loadMembershipContext(
  organizationId: string,
  clerkUserId: string,
): Promise<OrganizationContextRow | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({
      membershipId: memberships.id,
      organizationId: organizations.id,
      workspaceLabel: organizations.workspaceLabel,
      businessName: organizations.name,
      ownerName: organizations.ownerName,
      toneGuidance: organizations.toneGuidance,
      role: memberships.role,
      canApprove: memberships.canApprove,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function loadExistingMembershipForUser(
  clerkUserId: string,
): Promise<OrganizationContextRow | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({
      membershipId: memberships.id,
      organizationId: organizations.id,
      workspaceLabel: organizations.workspaceLabel,
      businessName: organizations.name,
      ownerName: organizations.ownerName,
      toneGuidance: organizations.toneGuidance,
      role: memberships.role,
      canApprove: memberships.canApprove,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.clerkUserId, clerkUserId))
    .orderBy(asc(memberships.createdAt))
    .limit(1);

  return row ?? null;
}

async function loadSeedWorkspaceStats() {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [organizationStats] = await db
    .select({
      organizationCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(organizations);

  const membershipRows = await db
    .select({
      clerkUserId: memberships.clerkUserId,
    })
    .from(memberships);

  const seededMembershipCount = membershipRows.filter((row) =>
    row.clerkUserId.startsWith("seed_"),
  ).length;

  return {
    organizationCount: organizationStats?.organizationCount ?? 0,
    seededMembershipCount,
    realMembershipCount: membershipRows.length - seededMembershipCount,
  };
}

async function loadSingleOrganizationId() {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .orderBy(asc(organizations.createdAt))
    .limit(1);

  return row?.id ?? null;
}

async function ensureOrganizationRow(
  organizationId: string,
  values: {
    clerkOrganizationId?: string | null;
    workspaceLabel: string;
    businessName: string;
    ownerName: string;
  },
) {
  const db = getDb();

  if (!db) {
    return;
  }

  await db
    .insert(organizations)
    .values({
      id: organizationId,
      clerkOrganizationId: values.clerkOrganizationId ?? null,
      workspaceLabel: values.workspaceLabel,
      name: values.businessName,
      businessType: DEFAULT_BUSINESS_TYPE,
      ownerName: values.ownerName,
      toneGuidance: DEFAULT_TONE_GUIDANCE,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        clerkOrganizationId: values.clerkOrganizationId ?? null,
        workspaceLabel: values.workspaceLabel,
        name: values.businessName,
        ownerName: values.ownerName,
      },
    });
}

async function ensureMembershipRow(
  organizationId: string,
  clerkUserId: string,
  displayName: string,
  requestedRole: TeamRole,
  requestedCanApprove?: boolean,
) {
  const db = getDb();

  if (!db) {
    return;
  }

  const existing = await loadMembershipContext(organizationId, clerkUserId);
  const role = resolveMembershipRole(existing?.role ?? null, requestedRole);
  const canApprove =
    requestedCanApprove === true || existing?.canApprove === true || role !== "staff";
  const membershipId =
    existing?.membershipId ??
    clampIdentifier("membership", `${organizationId}_${clerkUserId}`);

  await db
    .insert(memberships)
    .values({
      id: membershipId,
      organizationId,
      clerkUserId,
      displayName,
      role,
      canApprove,
    })
    .onConflictDoUpdate({
      target: [memberships.organizationId, memberships.clerkUserId],
      set: {
        displayName,
        role,
        canApprove,
      },
    });
}

async function ensureClerkOrganizationWorkspace(
  userId: string,
  displayName: string,
  orgId: string,
  orgRole?: string | null,
) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [existingOrganization] = await db
    .select({
      id: organizations.id,
    })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  let workspaceLabel = "Operator Workspace";
  let businessName = "Operator Workspace";

  try {
    const client = await clerkClient();
    const organization = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    workspaceLabel = organization.slug ?? organization.name;
    businessName = organization.name;
  } catch {
    workspaceLabel = "Operator Workspace";
    businessName = "Operator Workspace";
  }

  if (
    !existingOrganization &&
    !allowsImplicitWorkspaceProvisioning(process.env.NODE_ENV)
  ) {
    return null;
  }

  const organizationId = existingOrganization?.id ?? clampIdentifier("org", orgId);
  await ensureOrganizationRow(organizationId, {
    clerkOrganizationId: orgId,
    workspaceLabel,
    businessName,
    ownerName: displayName,
  });
  await ensureMembershipRow(
    organizationId,
    userId,
    displayName,
    mapClerkRoleToTeamRole(orgRole),
  );

  return loadMembershipContext(organizationId, userId);
}

async function ensurePersonalWorkspace(userId: string, displayName: string) {
  if (!allowsImplicitWorkspaceProvisioning(process.env.NODE_ENV)) {
    return null;
  }

  const organizationId = clampIdentifier("org", `user_${userId}`);
  const workspaceLabel = "Operator Workspace";
  const businessName = `${displayName}'s Workspace`;

  await ensureOrganizationRow(organizationId, {
    clerkOrganizationId: null,
    workspaceLabel,
    businessName,
    ownerName: displayName,
  });
  await ensureMembershipRow(organizationId, userId, displayName, "owner");

  return loadMembershipContext(organizationId, userId);
}

async function tryAutoClaimSeedWorkspace(userId: string, displayName: string) {
  const stats = await loadSeedWorkspaceStats();

  if (
    !stats ||
    !shouldAutoClaimSeedWorkspace({
      nodeEnv: process.env.NODE_ENV,
      ...stats,
    })
  ) {
    return null;
  }

  const organizationId = await loadSingleOrganizationId();

  if (!organizationId) {
    return null;
  }

  await ensureMembershipRow(organizationId, userId, displayName, "owner");
  return loadMembershipContext(organizationId, userId);
}

export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const db = getDb();

  if (!db) {
    return null;
  }

  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const displayName = pickDisplayName(user);

  if (orgId) {
    const orgContext = await ensureClerkOrganizationWorkspace(
      userId,
      displayName,
      orgId,
      orgRole,
    );

    if (orgContext) {
      return {
        userId,
        membershipId: orgContext.membershipId,
        organizationId: orgContext.organizationId,
        workspaceLabel: orgContext.workspaceLabel,
        businessName: orgContext.businessName,
        ownerName: orgContext.ownerName,
        toneGuidance: orgContext.toneGuidance,
        role: orgContext.role,
        canApprove: orgContext.canApprove,
      };
    }
  }

  const existingMembership = await loadExistingMembershipForUser(userId);

  if (existingMembership) {
    return {
      userId,
      membershipId: existingMembership.membershipId,
      organizationId: existingMembership.organizationId,
      workspaceLabel: existingMembership.workspaceLabel,
      businessName: existingMembership.businessName,
      ownerName: existingMembership.ownerName,
      toneGuidance: existingMembership.toneGuidance,
      role: existingMembership.role,
      canApprove: existingMembership.canApprove,
    };
  }

  const claimedSeedMembership = await tryAutoClaimSeedWorkspace(userId, displayName);

  if (claimedSeedMembership) {
    return {
      userId,
      membershipId: claimedSeedMembership.membershipId,
      organizationId: claimedSeedMembership.organizationId,
      workspaceLabel: claimedSeedMembership.workspaceLabel,
      businessName: claimedSeedMembership.businessName,
      ownerName: claimedSeedMembership.ownerName,
      toneGuidance: claimedSeedMembership.toneGuidance,
      role: claimedSeedMembership.role,
      canApprove: claimedSeedMembership.canApprove,
    };
  }

  const personalWorkspace = await ensurePersonalWorkspace(userId, displayName);

  if (!personalWorkspace) {
    return null;
  }

  return {
    userId,
    membershipId: personalWorkspace.membershipId,
    organizationId: personalWorkspace.organizationId,
    workspaceLabel: personalWorkspace.workspaceLabel,
    businessName: personalWorkspace.businessName,
    ownerName: personalWorkspace.ownerName,
    toneGuidance: personalWorkspace.toneGuidance,
    role: personalWorkspace.role,
    canApprove: personalWorkspace.canApprove,
  };
});

export async function requireViewerContext() {
  const viewerContext = await getViewerContext();

  if (!viewerContext) {
    throw new Error("Unauthorized.");
  }

  return viewerContext;
}
