import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  approvalItems,
  deliveryAttempts,
  invoices,
  memberships,
} from "@/lib/operator/db/schema";
import { advanceApprovalItem } from "@/lib/operator/domain/approval-policy";

export type ApprovalMutationAction = "approve" | "reject";
export type ApprovalMutationOrigin = "web" | "email" | "whatsapp";

export type ApprovalMutationRequest = Readonly<{
  action: ApprovalMutationAction;
  actorMembershipId: string;
  approvalItemId: string;
  origin: ApprovalMutationOrigin;
  organizationId: string;
}>;

export type ApprovalMutationResult = Readonly<{
  changed: boolean;
  status:
    | "pending"
    | "edited"
    | "approved"
    | "rejected"
    | "sent"
    | "failed"
    | "stale";
}>;

function buildActionRecordId(prefix: string, approvalItemId: string) {
  return `${prefix}_${approvalItemId}_${crypto.randomUUID()}`.slice(0, 120);
}

function formatOriginLabel(origin: ApprovalMutationOrigin) {
  switch (origin) {
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    default:
      return "Web";
  }
}

function formatDeliveryChannelLabel(channel: "web" | "email" | "whatsapp") {
  switch (channel) {
    case "email":
      return "Gmail";
    case "whatsapp":
      return "WhatsApp";
    default:
      return "Web";
  }
}

export async function mutateApprovalItemWithMembership({
  action,
  actorMembershipId,
  approvalItemId,
  origin,
  organizationId,
}: ApprovalMutationRequest): Promise<ApprovalMutationResult> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [approvalItem] = await db
    .select({
      id: approvalItems.id,
      organizationId: approvalItems.organizationId,
      invoiceId: approvalItems.invoiceId,
      status: approvalItems.status,
      channel: approvalItems.channel,
      draftContent: approvalItems.draftContent,
      approvedByMembershipId: approvalItems.approvedByMembershipId,
      rejectedByMembershipId: approvalItems.rejectedByMembershipId,
      invoiceCode: invoices.invoiceId,
      clientName: invoices.clientName,
    })
    .from(approvalItems)
    .innerJoin(invoices, eq(approvalItems.invoiceId, invoices.id))
    .where(eq(approvalItems.id, approvalItemId))
    .limit(1);

  if (!approvalItem) {
    throw new Error("Approval item not found.");
  }

  if (approvalItem.organizationId !== organizationId) {
    throw new Error("Cannot mutate approval items outside the active workspace.");
  }

  const [actor] = await db
    .select({
      id: memberships.id,
      name: memberships.displayName,
      role: memberships.role,
      canApprove: memberships.canApprove,
      organizationId: memberships.organizationId,
    })
    .from(memberships)
    .where(eq(memberships.id, actorMembershipId))
    .limit(1);

  if (!actor || actor.organizationId !== organizationId) {
    throw new Error("Actor not found.");
  }

  if (!actor.canApprove) {
    throw new Error("Actor is not allowed to approve outbound messages.");
  }

  const nextState = advanceApprovalItem(
    {
      id: approvalItem.id,
      invoiceId: approvalItem.invoiceId,
      status: approvalItem.status,
      channel: approvalItem.channel,
      approvedBy: approvalItem.approvedByMembershipId ?? undefined,
      rejectedBy: approvalItem.rejectedByMembershipId ?? undefined,
    },
    {
      id: actor.id,
      name: actor.name,
      role: actor.role,
    },
    action,
  );

  const isStateUnchanged =
    nextState.status === approvalItem.status &&
    (nextState.approvedBy ?? null) === approvalItem.approvedByMembershipId &&
    (nextState.rejectedBy ?? null) === approvalItem.rejectedByMembershipId;

  if (isStateUnchanged) {
    return {
      changed: false,
      status: nextState.status,
    };
  }

  await db
    .update(approvalItems)
    .set({
      status: nextState.status,
      approvedByMembershipId: nextState.approvedBy ?? null,
      rejectedByMembershipId: nextState.rejectedBy ?? null,
    })
    .where(
      and(
        eq(approvalItems.id, approvalItemId),
        eq(approvalItems.organizationId, organizationId),
      ),
    );

  await db.insert(activityLogs).values({
    id: buildActionRecordId("activity", approvalItem.id),
    organizationId,
    actorMembershipId,
    subjectType: "approval_item",
    subjectId: approvalItem.id,
    title: action === "approve" ? "Draft approved" : "Draft rejected",
    message:
      action === "approve"
        ? `${actor.name} approved ${approvalItem.invoiceCode} for ${approvalItem.clientName} from ${formatOriginLabel(origin)}.`
        : `${actor.name} rejected ${approvalItem.invoiceCode} for ${approvalItem.clientName} from ${formatOriginLabel(origin)}.`,
    metadata: {
      channel: formatOriginLabel(origin),
      invoiceId: approvalItem.invoiceCode,
      approvalItemId: approvalItem.id,
      nextStatus: nextState.status,
      origin,
      deliveryChannel: formatDeliveryChannelLabel(approvalItem.channel),
    },
  });

  if (action === "approve") {
    await db.insert(deliveryAttempts).values({
      id: buildActionRecordId("delivery", approvalItem.id),
      approvalItemId: approvalItem.id,
      channel: approvalItem.channel,
      state: "queued",
      providerReference: null,
      responseMetadata: {
        actorMembershipId,
        invoiceId: approvalItem.invoiceCode,
        trigger: `${origin}-approval`,
        draftPreview: approvalItem.draftContent.slice(0, 160),
        targetChannel: approvalItem.channel,
      },
    });
  }

  return {
    changed: true,
    status: nextState.status,
  };
}
