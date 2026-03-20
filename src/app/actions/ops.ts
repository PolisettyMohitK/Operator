"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  approvalItems,
  connectedAccounts,
  deliveryAttempts,
  syncRuns,
} from "@/lib/operator/db/schema";
import { processQueuedApprovalDeliveries } from "@/lib/operator/delivery/worker";
import { getOpsUserIds } from "@/lib/operator/integrations/env";
import { canAccessOpsSurface } from "@/lib/operator/ops/access";
import { processQueuedInvoiceSyncRuns } from "@/lib/operator/sync/invoice-worker";

function buildRecordId(prefix: string, value: string) {
  return `${prefix}_${value}_${crypto.randomUUID()}`.slice(0, 120);
}

async function requireOpsViewer() {
  const viewerContext = await requireViewerContext();

  if (
    !canAccessOpsSurface({
      viewerUserId: viewerContext.userId,
      viewerRole: viewerContext.role,
      opsUserIds: getOpsUserIds(process.env),
      nodeEnv: process.env.NODE_ENV,
    })
  ) {
    throw new Error("Not authorized to use the Operator ops surface.");
  }

  return viewerContext;
}

export async function retryInvoiceSync(organizationId: string) {
  const viewerContext = await requireOpsViewer();
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [connectedGoogleSheetsAccount] = await db
    .select({
      id: connectedAccounts.id,
    })
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.organizationId, organizationId),
        eq(connectedAccounts.provider, "google_sheets"),
        eq(connectedAccounts.status, "connected"),
      ),
    )
    .limit(1);

  await db.insert(syncRuns).values({
    id: buildRecordId("sync", organizationId),
    organizationId,
    connectedAccountId: connectedGoogleSheetsAccount?.id ?? null,
    kind: "invoice_sync",
    status: "pending",
    detail: "Manual invoice sync retry requested from the ops surface.",
    retryCount: 0,
    metadata: {
      requestedByMembershipId: viewerContext.membershipId,
      trigger: "ops_retry",
    },
    finishedAt: null,
  });

  await db.insert(activityLogs).values({
    id: buildRecordId("activity", organizationId),
    organizationId,
    actorMembershipId: viewerContext.membershipId,
    subjectType: "ops_sync_retry",
    subjectId: organizationId,
    title: "Invoice sync retry requested",
    message: "An internal operator requested another invoice sync attempt.",
    metadata: {
      channel: "Web",
      trigger: "ops_retry",
    },
  });

  await processQueuedInvoiceSyncRuns({
    organizationId,
  });

  revalidatePath("/ops");
}

export async function retryDeliveryAttempt(deliveryAttemptId: string) {
  const viewerContext = await requireOpsViewer();
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [attempt] = await db
    .select({
      id: deliveryAttempts.id,
      approvalItemId: deliveryAttempts.approvalItemId,
      channel: deliveryAttempts.channel,
      organizationId: approvalItems.organizationId,
      metadata: deliveryAttempts.responseMetadata,
    })
    .from(deliveryAttempts)
    .innerJoin(
      approvalItems,
      eq(deliveryAttempts.approvalItemId, approvalItems.id),
    )
    .where(eq(deliveryAttempts.id, deliveryAttemptId))
    .limit(1);

  if (!attempt) {
    throw new Error("Delivery attempt not found.");
  }

  await db.insert(deliveryAttempts).values({
    id: buildRecordId("delivery", `${attempt.approvalItemId}_ops_retry`),
    approvalItemId: attempt.approvalItemId,
    channel: attempt.channel,
    state: "queued",
    providerReference: null,
    responseMetadata: {
      ...(attempt.metadata ?? {}),
      trigger: "ops_retry",
      requestedByMembershipId: viewerContext.membershipId,
      sourceDeliveryAttemptId: attempt.id,
      retryCount:
        typeof attempt.metadata?.retryCount === "number"
          ? attempt.metadata.retryCount
          : 0,
    },
  });

  await db
    .update(approvalItems)
    .set({
      status: "approved",
    })
    .where(
      and(
        eq(approvalItems.id, attempt.approvalItemId),
        eq(approvalItems.organizationId, attempt.organizationId),
      ),
    );

  await processQueuedApprovalDeliveries({
    organizationId: attempt.organizationId,
  });

  revalidatePath("/app");
  revalidatePath("/app/activity");
  revalidatePath("/app/integrations");
  revalidatePath("/app/queue");
  revalidatePath("/ops");
}
