import { desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";

import { getDb } from "@/lib/operator/db/client";
import {
  approvalItems,
  clients,
  invoices,
  memberships,
  organizations,
} from "@/lib/operator/db/schema";
import {
  formatQueueChannelLabel,
  summarizeInvoiceChannels,
} from "@/lib/operator/db/view-models";

export type QueueDisplayItem = {
  id: string;
  invoiceId: string;
  status: "pending" | "edited" | "approved" | "rejected" | "sent" | "failed" | "stale";
  channel: "web" | "email" | "whatsapp";
  clientName: string;
  amountDue: number;
  risk: "routine" | "watch" | "urgent";
  reason: string;
  preview: string;
  channelLabel: string;
};

export type InvoiceDisplayRow = {
  id: string;
  invoiceId: string;
  clientName: string;
  dueDate: string;
  amountDue: number;
  status: string;
  channel: string;
  owner: string;
  lastFollowUpAt: string;
};

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function listQueueItems(): Promise<QueueDisplayItem[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: approvalItems.id,
      status: approvalItems.status,
      channel: approvalItems.channel,
      risk: approvalItems.riskLevel,
      reason: approvalItems.rationale,
      preview: approvalItems.draftContent,
      invoiceCode: invoices.invoiceId,
      amountDue: invoices.amountDue,
      invoiceClientName: invoices.clientName,
      clientName: clients.name,
    })
    .from(approvalItems)
    .innerJoin(invoices, eq(approvalItems.invoiceId, invoices.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(approvalItems.createdAt));

  return rows.map((row) => ({
    id: row.id,
    invoiceId: row.invoiceCode,
    status: row.status,
    channel: row.channel,
    clientName: row.clientName ?? row.invoiceClientName,
    amountDue: Number(row.amountDue),
    risk: row.risk,
    reason: row.reason,
    preview: row.preview,
    channelLabel: formatQueueChannelLabel(row.channel),
  }));
}

export async function listInvoicesForPage(): Promise<InvoiceDisplayRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const invoiceRows = await db
    .select({
      id: invoices.id,
      invoiceId: invoices.invoiceId,
      dueDate: invoices.dueDate,
      amountDue: invoices.amountDue,
      status: invoices.status,
      lastFollowUpAt: invoices.lastFollowUpAt,
      invoiceClientName: invoices.clientName,
      clientName: clients.name,
      owner: organizations.ownerName,
    })
    .from(invoices)
    .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.dueDate));

  if (invoiceRows.length === 0) {
    return [];
  }

  const invoiceIds = invoiceRows.map((row) => row.id);
  const channelRows = await db
    .select({
      invoiceId: approvalItems.invoiceId,
      channel: approvalItems.channel,
    })
    .from(approvalItems)
    .where(inArray(approvalItems.invoiceId, invoiceIds));

  const channelsByInvoice = new Map<
    string,
    Array<"web" | "email" | "whatsapp">
  >();

  for (const row of channelRows) {
    const existing = channelsByInvoice.get(row.invoiceId) ?? [];
    existing.push(row.channel);
    channelsByInvoice.set(row.invoiceId, existing);
  }

  return invoiceRows.map((row) => ({
    id: row.id,
    invoiceId: row.invoiceId,
    clientName: row.clientName ?? row.invoiceClientName,
    dueDate: format(row.dueDate, "MMM dd"),
    amountDue: Number(row.amountDue),
    status: titleCase(row.status),
    channel: summarizeInvoiceChannels(channelsByInvoice.get(row.id) ?? []),
    owner: row.owner,
    lastFollowUpAt: row.lastFollowUpAt
      ? format(row.lastFollowUpAt, "MMM dd")
      : "—",
  }));
}

export async function resolveActorMembershipId(clerkUserId?: string | null) {
  const db = getDb();

  if (!db) {
    return null;
  }

  if (clerkUserId) {
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.clerkUserId, clerkUserId))
      .limit(1);

    if (membership) {
      return membership.id;
    }
  }

  const [fallbackMembership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(inArray(memberships.role, ["owner", "approver"]))
    .limit(1);

  return fallbackMembership?.id ?? null;
}
