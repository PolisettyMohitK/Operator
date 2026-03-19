"use server";

import { revalidatePath } from "next/cache";

import {
  assertApprovalMutationAccess,
  requireViewerContext,
} from "@/lib/operator/datalayer/viewer-context";
import { mutateApprovalItemWithMembership } from "@/lib/operator/datalayer/approval-mutations";
import { dispatchApprovalPrompts } from "@/lib/operator/delivery/approval-prompts";

async function mutateApprovalItem(id: string, action: "approve" | "reject") {
  const viewerContext = await requireViewerContext();

  assertApprovalMutationAccess({
    viewerOrganizationId: viewerContext.organizationId,
    viewerCanApprove: viewerContext.canApprove,
    targetOrganizationId: viewerContext.organizationId,
  });

  await mutateApprovalItemWithMembership({
    action,
    actorMembershipId: viewerContext.membershipId,
    approvalItemId: id,
    origin: "web",
    organizationId: viewerContext.organizationId,
  });

  revalidatePath("/app");
  revalidatePath("/app/activity");
  revalidatePath("/app/queue");
}

export async function approveItem(id: string) {
  await mutateApprovalItem(id, "approve");
}

export async function rejectItem(id: string) {
  await mutateApprovalItem(id, "reject");
}

export async function sendApprovalPrompts(id: string) {
  const viewerContext = await requireViewerContext();

  await dispatchApprovalPrompts({
    actorMembershipId: viewerContext.membershipId,
    approvalItemId: id,
    organizationId: viewerContext.organizationId,
  });

  revalidatePath("/app/activity");
  revalidatePath("/app/queue");
}
