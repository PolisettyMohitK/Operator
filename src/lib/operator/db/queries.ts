import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";

import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  approvalItems,
  channelStates,
  clients,
  invoices,
  memberships,
  memoryProfiles,
  onboardingCheckpoints,
  organizations,
  sheetMappings,
  toolConnections,
} from "@/lib/operator/db/schema";
import {
  formatActivityTimestamp,
  formatCompactUsdAmount,
  formatMetricCount,
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

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  trend: string;
};

export type ActivityFeedItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  channel: string;
};

export type ClientDisplayRow = {
  id: string;
  name: string;
  contact: string;
  lastTouchpoint: string;
  balanceAmount: number;
  balanceFormatted: string;
  sentiment: string;
};

export type IntegrationDisplayRow = {
  id: string;
  name: string;
  status: string;
  detail: string;
};

export type TeamMemberDisplayRow = {
  id: string;
  name: string;
  role: "owner" | "staff" | "approver";
  canApprove: boolean;
};

export type ChannelStateDisplayRow = {
  channel: "web" | "email" | "whatsapp";
  state: string;
  note: string;
};

export type SettingsDisplayState = {
  toneGuidance: string;
  channelStates: ChannelStateDisplayRow[];
};

export type OnboardingStepDisplayRow = {
  id: string;
  position: number;
  label: string;
};

export type OnboardingDisplayState = {
  steps: OnboardingStepDisplayRow[];
  mappedColumns: Array<{
    label: string;
    value: string;
  }>;
  approverCount: number;
  reminderPolicy: {
    urgentAfterDays: number;
    staleAfterDays: number;
    minimumSpacingDays: number;
  } | null;
  connectedToolCount: number;
};

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export async function listQueueItems(
  organizationId: string,
): Promise<QueueDisplayItem[]> {
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
    .where(eq(approvalItems.organizationId, organizationId))
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

export async function listInvoicesForPage(
  organizationId: string,
): Promise<InvoiceDisplayRow[]> {
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
    .where(eq(invoices.organizationId, organizationId))
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
    .where(
      and(
        eq(approvalItems.organizationId, organizationId),
        inArray(approvalItems.invoiceId, invoiceIds),
      ),
    );

  const channelsByInvoice = new Map<string, Array<"web" | "email" | "whatsapp">>();

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
      : "-",
  }));
}

export async function listDashboardMetrics(
  organizationId: string,
): Promise<DashboardMetric[]> {
  const db = getDb();

  const defaultMetrics: DashboardMetric[] = [
    {
      label: "Cash at risk",
      value: "$0",
      detail: "Across 0 active overdue invoices",
      trend: "0 urgent approvals currently open",
    },
    {
      label: "Pending approvals",
      value: "00",
      detail: "0 urgent, 0 edited by humans",
      trend: "0 outbound channels currently in play",
    },
    {
      label: "Auto-prepared drafts",
      value: "00",
      detail: "Generated from live approval records in the last 24 hours",
      trend: "0 required manual edits",
    },
    {
      label: "Recovered this month",
      value: "$0",
      detail: "Across 0 settled invoices",
      trend: "No recovered invoices yet this month",
    },
  ];

  if (!db) {
    return defaultMetrics;
  }

  const [invoiceStats] = await db
    .select({
      cashAtRisk:
        sql<string>`coalesce(sum(case when ${invoices.status} = 'overdue' then ${invoices.amountDue} else 0 end), 0)`,
      overdueCount:
        sql<number>`count(case when ${invoices.status} = 'overdue' then 1 end)`.mapWith(
          Number,
        ),
      recoveredAmount:
        sql<string>`coalesce(sum(case when ${invoices.status} in ('paid', 'recovered') then ${invoices.amountDue} else 0 end), 0)`,
      recoveredCount:
        sql<number>`count(case when ${invoices.status} in ('paid', 'recovered') then 1 end)`.mapWith(
          Number,
        ),
    })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId));

  const [approvalStats] = await db
    .select({
      pendingCount:
        sql<number>`count(case when ${approvalItems.status} in ('pending', 'edited') then 1 end)`.mapWith(
          Number,
        ),
      urgentCount:
        sql<number>`count(case when ${approvalItems.status} in ('pending', 'edited') and ${approvalItems.riskLevel} = 'urgent' then 1 end)`.mapWith(
          Number,
        ),
      editedCount:
        sql<number>`count(case when ${approvalItems.status} = 'edited' then 1 end)`.mapWith(
          Number,
        ),
      last24hDraftCount:
        sql<number>`count(case when ${approvalItems.createdAt} >= now() - interval '24 hours' then 1 end)`.mapWith(
          Number,
        ),
      activeChannelCount:
        sql<number>`count(distinct case when ${approvalItems.status} in ('pending', 'edited') then ${approvalItems.channel} end)`.mapWith(
          Number,
        ),
    })
    .from(approvalItems)
    .where(eq(approvalItems.organizationId, organizationId));

  const cashAtRisk = Number(invoiceStats?.cashAtRisk ?? 0);
  const overdueCount = invoiceStats?.overdueCount ?? 0;
  const recoveredAmount = Number(invoiceStats?.recoveredAmount ?? 0);
  const recoveredCount = invoiceStats?.recoveredCount ?? 0;

  const pendingCount = approvalStats?.pendingCount ?? 0;
  const urgentCount = approvalStats?.urgentCount ?? 0;
  const editedCount = approvalStats?.editedCount ?? 0;
  const last24hDraftCount = approvalStats?.last24hDraftCount ?? 0;
  const activeChannelCount = approvalStats?.activeChannelCount ?? 0;

  return [
    {
      label: "Cash at risk",
      value: formatCompactUsdAmount(cashAtRisk),
      detail: `Across ${overdueCount} active overdue ${pluralize(overdueCount, "invoice")}`,
      trend: `${urgentCount} urgent ${pluralize(urgentCount, "approval")} currently open`,
    },
    {
      label: "Pending approvals",
      value: formatMetricCount(pendingCount),
      detail: `${urgentCount} urgent, ${editedCount} edited by humans`,
      trend: `${activeChannelCount} outbound ${pluralize(activeChannelCount, "channel")} currently in play`,
    },
    {
      label: "Auto-prepared drafts",
      value: formatMetricCount(last24hDraftCount),
      detail: "Generated from live approval records in the last 24 hours",
      trend: `${editedCount} required manual edits`,
    },
    {
      label: "Recovered this month",
      value: formatCompactUsdAmount(recoveredAmount),
      detail: `Across ${recoveredCount} settled ${pluralize(recoveredCount, "invoice")}`,
      trend:
        recoveredCount > 0
          ? "Based on invoices marked paid or recovered"
          : "No recovered invoices yet this month",
    },
  ];
}

export async function listActivityEvents(
  organizationId: string,
  limit = 6,
): Promise<ActivityFeedItem[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: activityLogs.id,
      title: activityLogs.title,
      detail: activityLogs.message,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
    })
    .from(activityLogs)
    .where(eq(activityLogs.organizationId, organizationId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const channel =
      typeof row.metadata.channel === "string" ? row.metadata.channel : "Web";
    const timeLabel =
      typeof row.metadata.timeLabel === "string" ? row.metadata.timeLabel : undefined;

    return {
      id: row.id,
      title: row.title,
      detail: row.detail,
      channel,
      timestamp: formatActivityTimestamp(row.createdAt, timeLabel),
    };
  });
}

export async function listClientsForPage(
  organizationId: string,
  limit?: number,
): Promise<ClientDisplayRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const baseQuery = db
    .select({
      id: clients.id,
      name: clients.name,
      contact: clients.contactName,
      lastTouchpoint: clients.lastTouchpoint,
      balance: clients.balance,
      sentiment: clients.sentiment,
    })
    .from(clients)
    .where(eq(clients.organizationId, organizationId))
    .orderBy(desc(clients.balance));

  const rows = limit ? await baseQuery.limit(limit) : await baseQuery;

  return rows.map((row) => {
    const balanceAmount = Number(row.balance);

    return {
      id: row.id,
      name: row.name,
      contact: row.contact,
      lastTouchpoint: row.lastTouchpoint,
      balanceAmount,
      balanceFormatted: `$${balanceAmount.toLocaleString()}`,
      sentiment: row.sentiment,
    };
  });
}

export async function listToolConnections(
  organizationId: string,
): Promise<IntegrationDisplayRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: toolConnections.id,
      name: toolConnections.provider,
      status: toolConnections.status,
      detail: toolConnections.detail,
    })
    .from(toolConnections)
    .where(eq(toolConnections.organizationId, organizationId))
    .orderBy(asc(toolConnections.provider));

  return rows;
}

export async function listTeamMembers(
  organizationId: string,
): Promise<TeamMemberDisplayRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: memberships.id,
      name: memberships.displayName,
      role: memberships.role,
      canApprove: memberships.canApprove,
    })
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(asc(memberships.createdAt));

  return rows;
}

export async function getSettingsDisplayState(
  organizationId: string,
): Promise<SettingsDisplayState> {
  const db = getDb();

  if (!db) {
    return {
      toneGuidance: "",
      channelStates: [],
    };
  }

  const [[profile], channelRows] = await Promise.all([
    db
      .select({
        communicationTone: memoryProfiles.communicationTone,
      })
      .from(memoryProfiles)
      .where(eq(memoryProfiles.organizationId, organizationId))
      .limit(1),
    db
      .select({
        channel: channelStates.channel,
        state: channelStates.state,
        note: channelStates.note,
      })
      .from(channelStates)
      .where(eq(channelStates.organizationId, organizationId))
      .orderBy(asc(channelStates.channel)),
  ]);

  return {
    toneGuidance: profile?.communicationTone ?? "",
    channelStates: channelRows,
  };
}

export async function getOnboardingDisplayState(
  organizationId: string,
): Promise<OnboardingDisplayState> {
  const db = getDb();

  if (!db) {
    return {
      steps: [],
      mappedColumns: [],
      approverCount: 0,
      reminderPolicy: null,
      connectedToolCount: 0,
    };
  }

  const [[mappingRow], [memoryProfile], toolRows, stepRows, [approverStats]] =
    await Promise.all([
      db
        .select({
          mapping: sheetMappings.mapping,
        })
        .from(sheetMappings)
        .where(eq(sheetMappings.organizationId, organizationId))
        .orderBy(desc(sheetMappings.createdAt))
        .limit(1),
      db
        .select({
          reminderPolicy: memoryProfiles.reminderPolicy,
        })
        .from(memoryProfiles)
        .where(eq(memoryProfiles.organizationId, organizationId))
        .limit(1),
      db
        .select({
          id: toolConnections.id,
        })
        .from(toolConnections)
        .where(eq(toolConnections.organizationId, organizationId)),
      db
        .select({
          id: onboardingCheckpoints.id,
          position: onboardingCheckpoints.position,
          label: onboardingCheckpoints.label,
        })
        .from(onboardingCheckpoints)
        .where(eq(onboardingCheckpoints.organizationId, organizationId))
        .orderBy(asc(onboardingCheckpoints.position)),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, organizationId),
            eq(memberships.canApprove, true),
          ),
        ),
    ]);

  const mapping = mappingRow?.mapping ?? {};

  return {
    steps: stepRows,
    mappedColumns: [
      {
        label: "Invoice ID",
        value:
          typeof mapping.invoiceId === "string" ? mapping.invoiceId : "Not mapped yet",
      },
      {
        label: "Client contact",
        value:
          typeof mapping.clientEmail === "string" || typeof mapping.clientPhone === "string"
            ? [mapping.clientEmail, mapping.clientPhone].filter(Boolean).join(" + ")
            : "Not mapped yet",
      },
      {
        label: "Amount due",
        value:
          typeof mapping.amountDue === "string" ? mapping.amountDue : "Not mapped yet",
      },
      {
        label: "Due date",
        value: typeof mapping.dueDate === "string" ? mapping.dueDate : "Not mapped yet",
      },
    ],
    approverCount: approverStats?.count ?? 0,
    reminderPolicy: memoryProfile?.reminderPolicy ?? null,
    connectedToolCount: toolRows.length,
  };
}
