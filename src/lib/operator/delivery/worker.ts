import { and, asc, eq } from "drizzle-orm";

import {
  getGmailAdapterForOrganization,
  GmailAdapterNotConfiguredError,
  GmailSendDraftError,
} from "@/lib/operator/adapters/gmail";
import { resolveWorkspaceEntitlements } from "@/lib/operator/billing/entitlements";
import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  agentPolicies,
  approvalItems,
  deliveryAttempts,
  invoices,
} from "@/lib/operator/db/schema";

type DeliveryWorkerInput = Readonly<{
  organizationId: string;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
}>;

type QueuedDeliveryRow = Readonly<{
  attemptId: string;
  approvalItemId: string;
  organizationId: string;
  approvalStatus:
    | "pending"
    | "edited"
    | "approved"
    | "rejected"
    | "sent"
    | "failed"
    | "stale";
  channel: "web" | "email" | "whatsapp";
  draftContent: string;
  invoiceCode: string;
  clientName: string;
  clientEmail: string | null;
  metadata: Record<string, unknown>;
  desiredPolicy: Record<string, unknown> | null;
}>;

export type DeliveryWorkerSummary = Readonly<{
  processed: number;
  sent: number;
  failed: number;
  paused: number;
  queuedForRetry: number;
}>;

const MAX_RETRIES = 2;

function buildRecordId(prefix: string, value: string) {
  return `${prefix}_${value}_${crypto.randomUUID()}`.slice(0, 120);
}

function getRetryCount(metadata: Record<string, unknown>) {
  const value = metadata.retryCount;

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getPolicyFlags(policy: Record<string, unknown> | null) {
  const tools =
    policy && typeof policy.tools === "object" && policy.tools
      ? (policy.tools as Record<string, unknown>)
      : null;
  const automation =
    policy && typeof policy.automation === "object" && policy.automation
      ? (policy.automation as Record<string, unknown>)
      : null;

  return {
    gmailSendEnabled: tools?.gmailSend !== false,
    paused:
      automation?.killSwitch === true || automation?.paused === true,
  };
}

function buildDeliverySubject(row: QueuedDeliveryRow) {
  return `Follow-up: invoice ${row.invoiceCode} for ${row.clientName}`;
}

async function recordActivity(input: {
  approvalItemId: string;
  organizationId: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db.insert(activityLogs).values({
    id: buildRecordId("activity", input.approvalItemId),
    organizationId: input.organizationId,
    actorMembershipId: null,
    subjectType: "delivery_attempt",
    subjectId: input.approvalItemId,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
  });
}

async function updateAttemptState(input: {
  attemptId: string;
  state: string;
  providerReference?: string | null;
  metadata: Record<string, unknown>;
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db
    .update(deliveryAttempts)
    .set({
      state: input.state,
      providerReference: input.providerReference ?? null,
      responseMetadata: input.metadata,
    })
    .where(eq(deliveryAttempts.id, input.attemptId));
}

async function markApprovalStatus(input: {
  approvalItemId: string;
  status: "approved" | "sent" | "failed";
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db
    .update(approvalItems)
    .set({
      status: input.status,
    })
    .where(eq(approvalItems.id, input.approvalItemId));
}

async function enqueueRetryAttempt(row: QueuedDeliveryRow, retryCount: number) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db.insert(deliveryAttempts).values({
    id: buildRecordId("delivery", `${row.approvalItemId}_retry_${retryCount}`),
    approvalItemId: row.approvalItemId,
    channel: row.channel,
    state: "queued",
    providerReference: null,
    responseMetadata: {
      ...row.metadata,
      retryCount,
      scheduledFromAttemptId: row.attemptId,
    },
  });
}

async function loadQueuedAttempts(
  organizationId: string,
  maxAttempts: number,
): Promise<QueuedDeliveryRow[]> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const rows = await db
    .select({
      attemptId: deliveryAttempts.id,
      approvalItemId: deliveryAttempts.approvalItemId,
      organizationId: approvalItems.organizationId,
      approvalStatus: approvalItems.status,
      channel: deliveryAttempts.channel,
      draftContent: approvalItems.draftContent,
      invoiceCode: invoices.invoiceId,
      clientName: invoices.clientName,
      clientEmail: invoices.clientEmail,
      metadata: deliveryAttempts.responseMetadata,
      desiredPolicy: agentPolicies.desiredPolicy,
    })
    .from(deliveryAttempts)
    .innerJoin(
      approvalItems,
      eq(deliveryAttempts.approvalItemId, approvalItems.id),
    )
    .innerJoin(invoices, eq(approvalItems.invoiceId, invoices.id))
    .leftJoin(
      agentPolicies,
      eq(approvalItems.organizationId, agentPolicies.organizationId),
    )
    .where(
      and(
        eq(approvalItems.organizationId, organizationId),
        eq(deliveryAttempts.state, "queued"),
      ),
    )
    .orderBy(asc(deliveryAttempts.createdAt));

  return rows.slice(0, maxAttempts);
}

export async function processQueuedApprovalDeliveries(
  input: DeliveryWorkerInput,
): Promise<DeliveryWorkerSummary> {
  if (!input.organizationId) {
    throw new Error(
      "Queued delivery execution requires an explicit organization id.",
    );
  }

  const entitlements = await resolveWorkspaceEntitlements(input.organizationId);
  const queuedAttempts = await loadQueuedAttempts(
    input.organizationId,
    input.maxAttempts ?? 25,
  );
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let paused = 0;
  let queuedForRetry = 0;

  for (const row of queuedAttempts) {
    processed += 1;

    const policyFlags = getPolicyFlags(row.desiredPolicy);

    if (!entitlements.canRunBackgroundExecution || policyFlags.paused) {
      await updateAttemptState({
        attemptId: row.attemptId,
        state: "paused",
        metadata: {
          ...row.metadata,
          reason: !entitlements.canRunBackgroundExecution
            ? "workspace_not_entitled"
            : "policy_paused",
        },
      });
      await recordActivity({
        approvalItemId: row.approvalItemId,
        organizationId: row.organizationId,
        title: "Delivery paused",
        message:
          "Queued delivery is paused until workspace billing and runtime policy allow execution again.",
        metadata: {
          channel: "Email",
          invoiceId: row.invoiceCode,
          state: "paused",
        },
      });
      paused += 1;
      continue;
    }

    if (!policyFlags.gmailSendEnabled || row.channel !== "email") {
      await updateAttemptState({
        attemptId: row.attemptId,
        state: "paused",
        metadata: {
          ...row.metadata,
          reason: row.channel !== "email" ? "unsupported_channel" : "policy_blocked",
        },
      });
      await recordActivity({
        approvalItemId: row.approvalItemId,
        organizationId: row.organizationId,
        title: "Delivery paused",
        message:
          "Queued delivery is waiting for an enabled Gmail send policy in this workspace.",
        metadata: {
          channel: "Email",
          invoiceId: row.invoiceCode,
          state: "paused",
        },
      });
      paused += 1;
      continue;
    }

    if (row.approvalStatus !== "approved") {
      await updateAttemptState({
        attemptId: row.attemptId,
        state: "skipped",
        metadata: {
          ...row.metadata,
          reason: "approval_not_approved",
        },
      });
      continue;
    }

    if (!row.clientEmail) {
      await updateAttemptState({
        attemptId: row.attemptId,
        state: "failed",
        metadata: {
          ...row.metadata,
          reason: "missing_recipient",
        },
      });
      await markApprovalStatus({
        approvalItemId: row.approvalItemId,
        status: "failed",
      });
      await recordActivity({
        approvalItemId: row.approvalItemId,
        organizationId: row.organizationId,
        title: "Delivery failed",
        message: `Operator could not deliver ${row.invoiceCode} because the client email address is missing.`,
        metadata: {
          channel: "Email",
          invoiceId: row.invoiceCode,
          state: "failed",
        },
      });
      failed += 1;
      continue;
    }

    try {
      const gmailAdapter = await getGmailAdapterForOrganization({
        organizationId: row.organizationId,
        env: input.env,
        fetchImpl: input.fetchImpl,
      });
      const result = await gmailAdapter.sendDraft({
        subject: buildDeliverySubject(row),
        body: row.draftContent,
        recipient: row.clientEmail,
      });

      await updateAttemptState({
        attemptId: row.attemptId,
        state: "sent",
        providerReference: result.providerMessageId,
        metadata: {
          ...row.metadata,
          recipient: row.clientEmail,
          sentAt: new Date().toISOString(),
        },
      });
      await markApprovalStatus({
        approvalItemId: row.approvalItemId,
        status: "sent",
      });
      await recordActivity({
        approvalItemId: row.approvalItemId,
        organizationId: row.organizationId,
        title: "Follow-up delivered",
        message: `Operator delivered ${row.invoiceCode} to ${row.clientName} by Gmail.`,
        metadata: {
          channel: "Email",
          invoiceId: row.invoiceCode,
          state: "sent",
        },
      });
      sent += 1;
    } catch (error) {
      if (error instanceof GmailAdapterNotConfiguredError) {
        await updateAttemptState({
          attemptId: row.attemptId,
          state: "paused",
          metadata: {
            ...row.metadata,
            reason: "gmail_not_connected",
          },
        });
        await recordActivity({
          approvalItemId: row.approvalItemId,
          organizationId: row.organizationId,
          title: "Delivery paused",
          message:
            "Operator is waiting for a connected Gmail account before it can send this follow-up.",
          metadata: {
            channel: "Email",
            invoiceId: row.invoiceCode,
            state: "paused",
          },
        });
        paused += 1;
        continue;
      }

      const retryCount = getRetryCount(row.metadata);

      if (
        error instanceof GmailSendDraftError &&
        error.retryable &&
        retryCount < MAX_RETRIES
      ) {
        await updateAttemptState({
          attemptId: row.attemptId,
          state: "retry_scheduled",
          metadata: {
            ...row.metadata,
            lastError: error.message,
            retryCount,
          },
        });
        await enqueueRetryAttempt(row, retryCount + 1);
        await recordActivity({
          approvalItemId: row.approvalItemId,
          organizationId: row.organizationId,
          title: "Delivery retry scheduled",
          message: `Operator scheduled another Gmail delivery attempt for ${row.invoiceCode}.`,
          metadata: {
            channel: "Email",
            invoiceId: row.invoiceCode,
            retryCount: retryCount + 1,
            state: "retry_scheduled",
          },
        });
        queuedForRetry += 1;
        continue;
      }

      await updateAttemptState({
        attemptId: row.attemptId,
        state: "failed",
        metadata: {
          ...row.metadata,
          lastError: error instanceof Error ? error.message : "Unknown Gmail failure.",
          reason: "delivery_failed",
        },
      });
      await markApprovalStatus({
        approvalItemId: row.approvalItemId,
        status: "failed",
      });
      await recordActivity({
        approvalItemId: row.approvalItemId,
        organizationId: row.organizationId,
        title: "Delivery failed",
        message: `Operator could not deliver ${row.invoiceCode}. Review the failed attempt and retry after fixing the connection or recipient state.`,
        metadata: {
          channel: "Email",
          invoiceId: row.invoiceCode,
          state: "failed",
        },
      });
      failed += 1;
    }
  }

  return {
    processed,
    sent,
    failed,
    paused,
    queuedForRetry,
  };
}
