import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import {
  GmailAdapterNotConfiguredError,
  getGmailAdapterForOrganization,
} from "@/lib/operator/adapters/gmail";
import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  approvalItems,
  deliveryAttempts,
  invoices,
  memberships,
  organizations,
} from "@/lib/operator/db/schema";
import { isApprovalFinalized } from "@/lib/operator/db/view-models";
import {
  buildApprovalActionUrl,
  createApprovalActionToken,
  type ApprovalLinkChannel,
} from "@/lib/operator/delivery/approval-links";
import {
  getApprovalLinkSecret,
  getOperatorAppUrl,
} from "@/lib/operator/integrations/env";

type ApprovalPromptCopyInput = Readonly<{
  amountDue: number;
  approveUrl: string;
  clientName: string;
  draftContent: string;
  invoiceCode: string;
  queueUrl: string;
  reason: string;
  rejectUrl: string;
}>;

type ApprovalPromptTarget = Readonly<{
  actorMembershipId: string;
  approvalItemId: string;
  organizationId: string;
}>;

type ApprovalPromptDispatchAttempt = Readonly<{
  channel: ApprovalLinkChannel;
  deliveryAttemptId: string;
  membershipId: string;
  providerMessageId: string | null;
  recipient: string | null;
  state: "prompt_sent" | "prompt_failed" | "skipped";
}>;

function buildRecordId(prefix: string, value: string) {
  return `${prefix}_${value}_${crypto.randomUUID()}`.slice(0, 120);
}

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function formatAttemptChannel(channel: ApprovalLinkChannel) {
  return channel === "email" ? "Email" : "Web";
}

export function buildApprovalPromptCopy(input: ApprovalPromptCopyInput) {
  const amountLabel = formatCurrency(input.amountDue);

  return {
    emailSubject: `Approval needed: ${input.invoiceCode} for ${input.clientName}`,
    emailBody: [
      `Operator has prepared a follow-up for ${input.clientName}.`,
      "",
      `Invoice: ${input.invoiceCode}`,
      `Amount due: ${amountLabel}`,
      `Why this is in queue: ${input.reason}`,
      "",
      "Draft preview:",
      input.draftContent,
      "",
      `Approve: ${input.approveUrl}`,
      `Reject: ${input.rejectUrl}`,
      `Open queue: ${input.queueUrl}`,
    ].join("\n"),
    whatsAppMessage: [
      `Approval needed for ${input.invoiceCode} (${amountLabel})`,
      input.clientName,
      input.reason,
      "",
      `Approve: ${input.approveUrl}`,
      `Reject: ${input.rejectUrl}`,
      `Queue: ${input.queueUrl}`,
    ].join("\n"),
  };
}

async function resolveMembershipContacts(clerkUserId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);

    return {
      email:
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null,
      phone:
        user.primaryPhoneNumber?.phoneNumber ??
        user.phoneNumbers[0]?.phoneNumber ??
        null,
    };
  } catch {
    return {
      email: null,
      phone: null,
    };
  }
}

function buildActionUrls(input: {
  approvalItemId: string;
  appUrl: string;
  channel: ApprovalLinkChannel;
  deliveryAttemptId: string;
  secret: string;
}) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();

  return {
    approveUrl: buildApprovalActionUrl({
      appUrl: input.appUrl,
      token: createApprovalActionToken(
        {
          action: "approve",
          approvalItemId: input.approvalItemId,
          channel: input.channel,
          deliveryAttemptId: input.deliveryAttemptId,
          expiresAt,
        },
        input.secret,
      ),
    }),
    rejectUrl: buildApprovalActionUrl({
      appUrl: input.appUrl,
      token: createApprovalActionToken(
        {
          action: "reject",
          approvalItemId: input.approvalItemId,
          channel: input.channel,
          deliveryAttemptId: input.deliveryAttemptId,
          expiresAt,
        },
        input.secret,
      ),
    }),
  };
}

async function persistPromptAttempt(input: {
  id: string;
  approvalItemId: string;
  channel: ApprovalLinkChannel;
  membershipId: string;
  organizationId: string;
  providerMessageId: string | null;
  recipient: string | null;
  state: "prompt_sent" | "prompt_failed" | "skipped";
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db.insert(deliveryAttempts).values({
    id: input.id,
    approvalItemId: input.approvalItemId,
    channel: input.channel,
    state: input.state,
    providerReference: input.providerMessageId,
    responseMetadata: {
      membershipId: input.membershipId,
      organizationId: input.organizationId,
      recipient: input.recipient,
      purpose: "approval_prompt",
    },
  });
}

export async function dispatchApprovalPrompts(
  input: ApprovalPromptTarget,
): Promise<ApprovalPromptDispatchAttempt[]> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const appUrl = getOperatorAppUrl(process.env);
  const secret = getApprovalLinkSecret(process.env);

  if (!appUrl || !secret) {
    throw new Error(
      "Approval prompts require an app URL and approval-link signing secret.",
    );
  }

  const [approvalItem] = await db
    .select({
      id: approvalItems.id,
      organizationId: approvalItems.organizationId,
      status: approvalItems.status,
      channel: approvalItems.channel,
      reason: approvalItems.rationale,
      draftContent: approvalItems.draftContent,
      invoiceCode: invoices.invoiceId,
      clientName: invoices.clientName,
      amountDue: invoices.amountDue,
      organizationName: organizations.name,
    })
    .from(approvalItems)
    .innerJoin(invoices, eq(approvalItems.invoiceId, invoices.id))
    .innerJoin(organizations, eq(approvalItems.organizationId, organizations.id))
    .where(
      and(
        eq(approvalItems.id, input.approvalItemId),
        eq(approvalItems.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!approvalItem) {
    throw new Error("Approval item not found.");
  }

  if (isApprovalFinalized(approvalItem.status)) {
    throw new Error("Finalized approval items do not need new approval prompts.");
  }

  const approvers = await db
    .select({
      id: memberships.id,
      clerkUserId: memberships.clerkUserId,
      displayName: memberships.displayName,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, input.organizationId),
        eq(memberships.canApprove, true),
      ),
    );

  const queueUrl = new URL("/app/queue", appUrl).toString();
  const gmailAdapter = await (async () => {
    try {
      return await getGmailAdapterForOrganization({
        organizationId: input.organizationId,
      });
    } catch (error) {
      if (error instanceof GmailAdapterNotConfiguredError) {
        return null;
      }

      throw error;
    }
  })();

  const attempts: ApprovalPromptDispatchAttempt[] = [];

  for (const approver of approvers) {
    const contacts = await resolveMembershipContacts(approver.clerkUserId);

    if (gmailAdapter) {
      const emailDeliveryAttemptId = buildRecordId(
        "delivery",
        `${approvalItem.id}_email_${approver.id}`,
      );
      const emailUrls = buildActionUrls({
        approvalItemId: approvalItem.id,
        appUrl,
        channel: "email",
        deliveryAttemptId: emailDeliveryAttemptId,
        secret,
      });
      const promptCopy = buildApprovalPromptCopy({
        amountDue: Number(approvalItem.amountDue),
        approveUrl: emailUrls.approveUrl,
        clientName: approvalItem.clientName,
        draftContent: approvalItem.draftContent,
        invoiceCode: approvalItem.invoiceCode,
        queueUrl,
        reason: approvalItem.reason,
        rejectUrl: emailUrls.rejectUrl,
      });

      if (contacts.email) {
        try {
          const sentMessage = await gmailAdapter.sendDraft({
            subject: promptCopy.emailSubject,
            body: promptCopy.emailBody,
            recipient: contacts.email,
          });

          const attempt = {
            channel: "email" as const,
            deliveryAttemptId: emailDeliveryAttemptId,
            membershipId: approver.id,
            providerMessageId: sentMessage.providerMessageId,
            recipient: contacts.email,
            state: "prompt_sent" as const,
          };
          attempts.push(attempt);
          await persistPromptAttempt({
            approvalItemId: approvalItem.id,
            channel: attempt.channel,
            id: attempt.deliveryAttemptId,
            membershipId: attempt.membershipId,
            organizationId: input.organizationId,
            providerMessageId: attempt.providerMessageId,
            recipient: attempt.recipient,
            state: attempt.state,
          });
        } catch {
          const attempt = {
            channel: "email" as const,
            deliveryAttemptId: emailDeliveryAttemptId,
            membershipId: approver.id,
            providerMessageId: null,
            recipient: contacts.email,
            state: "prompt_failed" as const,
          };
          attempts.push(attempt);
          await persistPromptAttempt({
            approvalItemId: approvalItem.id,
            channel: attempt.channel,
            id: attempt.deliveryAttemptId,
            membershipId: attempt.membershipId,
            organizationId: input.organizationId,
            providerMessageId: attempt.providerMessageId,
            recipient: attempt.recipient,
            state: attempt.state,
          });
        }
      } else {
        const attempt = {
          channel: "email" as const,
          deliveryAttemptId: emailDeliveryAttemptId,
          membershipId: approver.id,
          providerMessageId: null,
          recipient: null,
          state: "skipped" as const,
        };
        attempts.push(attempt);
        await persistPromptAttempt({
          approvalItemId: approvalItem.id,
          channel: attempt.channel,
          id: attempt.deliveryAttemptId,
          membershipId: attempt.membershipId,
          organizationId: input.organizationId,
          providerMessageId: attempt.providerMessageId,
          recipient: attempt.recipient,
          state: attempt.state,
        });
      }
    }

  }

  const sentAttempts = attempts.filter((attempt) => attempt.state === "prompt_sent");
  const channelSummary =
    sentAttempts.length > 0
      ? Array.from(new Set(sentAttempts.map((attempt) => formatAttemptChannel(attempt.channel)))).join(
          " + ",
        )
      : "Web";

  await db.insert(activityLogs).values({
    id: buildRecordId("activity", approvalItem.id),
    organizationId: input.organizationId,
    actorMembershipId: input.actorMembershipId,
    subjectType: "approval_prompt",
    subjectId: approvalItem.id,
    title: "Approval prompts dispatched",
    message:
      sentAttempts.length > 0
        ? `${sentAttempts.length} approval prompt${sentAttempts.length === 1 ? "" : "s"} sent for ${approvalItem.invoiceCode}.`
        : `No approval prompts could be sent for ${approvalItem.invoiceCode}.`,
    metadata: {
      channel: channelSummary,
      approvalItemId: approvalItem.id,
      invoiceId: approvalItem.invoiceCode,
      promptCount: sentAttempts.length,
      organizationName: approvalItem.organizationName,
    },
  });

  return attempts;
}
