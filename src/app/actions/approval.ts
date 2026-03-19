"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import { approvalItems, memberships } from "@/lib/operator/db/schema";
import { advanceApprovalItem } from "@/lib/operator/domain/approval-policy";

async function mutateApprovalItem(
  id: string,
  actorId: string,
  action: "approve" | "reject",
) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [approvalItem] = await db
    .select({
      id: approvalItems.id,
      invoiceId: approvalItems.invoiceId,
      status: approvalItems.status,
      channel: approvalItems.channel,
      approvedByMembershipId: approvalItems.approvedByMembershipId,
      rejectedByMembershipId: approvalItems.rejectedByMembershipId,
    })
    .from(approvalItems)
    .where(eq(approvalItems.id, id))
    .limit(1);

  if (!approvalItem) {
    throw new Error("Approval item not found.");
  }

  const [actor] = await db
    .select({
      id: memberships.id,
      name: memberships.displayName,
      role: memberships.role,
    })
    .from(memberships)
    .where(eq(memberships.id, actorId))
    .limit(1);

  if (!actor) {
    throw new Error("Actor not found.");
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
    actor,
    action,
  );

  await db
    .update(approvalItems)
    .set({
      status: nextState.status,
      approvedByMembershipId: nextState.approvedBy ?? null,
      rejectedByMembershipId: nextState.rejectedBy ?? null,
    })
    .where(eq(approvalItems.id, id));

  revalidatePath("/app/queue");
}

export async function approveItem(id: string, actorId: string) {
  await mutateApprovalItem(id, actorId, "approve");
}

export async function rejectItem(id: string, actorId: string) {
  await mutateApprovalItem(id, actorId, "reject");
}
