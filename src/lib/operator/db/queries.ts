import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";

import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  agentPolicies,
  approvalItems,
  channelStates,
  clients,
  connectedAccounts,
  deliveryAttempts,
  invoices,
  memberships,
  memoryProfiles,
  onboardingCheckpoints,
  organizations,
  sheetMappings,
  subscriptions,
  syncRuns,
  toolConnections,
} from "@/lib/operator/db/schema";
import {
  buildDeliveryFailureState,
  buildOpenClawRuntimeState,
  buildSyncStalledState,
  type WorkspaceStatusCard,
} from "@/lib/operator/health/status";
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
  state: "healthy" | "attention_needed" | "degraded" | "paused";
  status: string;
  detail: string;
  lastSuccessfulEventLabel: string | null;
};

export type TeamMemberDisplayRow = {
  id: string;
  name: string;
  role: "owner" | "staff" | "approver";
  canApprove: boolean;
};

export type ChannelStateDisplayRow = {
  channel: "web" | "email";
  state: string;
  note: string;
};

export type SettingsDisplayState = {
  toneGuidance: string;
  channelStates: ChannelStateDisplayRow[];
  agentPolicy: {
    gmailSendEnabled: boolean;
    googleSheetsReadEnabled: boolean;
    killSwitchEnabled: boolean;
    runtimeStatus: string;
    lastError: string | null;
  };
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

export type BillingDisplayState = {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
};

export type AccountDisplayState = {
  workspaceLabel: string;
  businessName: string;
  workspaceStatus: string;
  ownerName: string;
  createdAt: string;
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

function formatTimestampOrNull(value: Date | null | undefined) {
  return value ? format(value, "MMM dd, HH:mm") : null;
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

  const [accountRows, [policyRow], legacyRows] = await Promise.all([
    db
      .select({
        id: connectedAccounts.id,
        provider: connectedAccounts.provider,
        status: connectedAccounts.status,
        externalAccountLabel: connectedAccounts.externalAccountLabel,
        reconnectReason: connectedAccounts.reconnectReason,
        lastSuccessfulSyncAt: connectedAccounts.lastSuccessfulSyncAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.organizationId, organizationId))
      .orderBy(asc(connectedAccounts.provider)),
    db
      .select({
        runtimeStatus: agentPolicies.runtimeStatus,
        lastObservedAt: agentPolicies.lastObservedAt,
        lastError: agentPolicies.lastError,
      })
      .from(agentPolicies)
      .where(eq(agentPolicies.organizationId, organizationId))
      .limit(1),
    db
      .select({
        id: toolConnections.id,
        name: toolConnections.provider,
        status: toolConnections.status,
        detail: toolConnections.detail,
      })
      .from(toolConnections)
      .where(eq(toolConnections.organizationId, organizationId))
      .orderBy(asc(toolConnections.provider)),
  ]);

  if (accountRows.length === 0 && !policyRow) {
    return legacyRows.map((row) => ({
      id: row.id,
      name: row.name,
      state: "attention_needed",
      status: row.status,
      detail: row.detail,
      lastSuccessfulEventLabel: null,
    }));
  }

  const rows: IntegrationDisplayRow[] = accountRows.map((row) => ({
    id: row.id,
    name: row.provider === "gmail" ? "Gmail" : "Google Sheets",
    state:
      row.status === "connected"
        ? ("healthy" as const)
        : row.status === "pending"
          ? ("attention_needed" as const)
          : ("degraded" as const),
    status: titleCase(row.status),
    detail:
      row.status === "connected"
        ? `Connected as ${row.externalAccountLabel}.`
        : row.reconnectReason ?? `Connection is ${row.status.replace(/_/g, " ")}.`,
    lastSuccessfulEventLabel: formatTimestampOrNull(row.lastSuccessfulSyncAt),
  }));

  if (policyRow) {
    rows.push({
      id: "openclaw-runtime",
      name: "OpenClaw runtime",
      state:
        policyRow.runtimeStatus === "healthy"
          ? "healthy"
          : policyRow.runtimeStatus === "paused"
            ? "paused"
            : "degraded",
      status: titleCase(policyRow.runtimeStatus),
      detail:
        policyRow.lastError ??
        "Operator is applying the managed runtime policy to OpenClaw.",
      lastSuccessfulEventLabel: formatTimestampOrNull(policyRow.lastObservedAt),
    });
  }

  return rows;
}

export async function getWorkspaceHealthCards(
  organizationId: string,
): Promise<WorkspaceStatusCard[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const [[policyRow], [syncRow], [failedDelivery]] = await Promise.all([
    db
      .select({
        runtimeStatus: agentPolicies.runtimeStatus,
        lastObservedAt: agentPolicies.lastObservedAt,
      })
      .from(agentPolicies)
      .where(eq(agentPolicies.organizationId, organizationId))
      .limit(1),
    db
      .select({
        detail: syncRuns.detail,
        finishedAt: syncRuns.finishedAt,
        status: syncRuns.status,
      })
      .from(syncRuns)
      .where(
        and(
          eq(syncRuns.organizationId, organizationId),
          eq(syncRuns.kind, "invoice_sync"),
        ),
      )
      .orderBy(desc(syncRuns.startedAt))
      .limit(1),
    db
      .select({
        approvalItemId: deliveryAttempts.approvalItemId,
      })
      .from(deliveryAttempts)
      .innerJoin(
        approvalItems,
        eq(deliveryAttempts.approvalItemId, approvalItems.id),
      )
      .where(
        and(
          eq(approvalItems.organizationId, organizationId),
          eq(deliveryAttempts.state, "failed"),
        ),
      )
      .orderBy(desc(deliveryAttempts.createdAt))
      .limit(1),
  ]);

  const cards: WorkspaceStatusCard[] = [];

  if (policyRow && policyRow.runtimeStatus !== "healthy") {
    cards.push(
      buildOpenClawRuntimeState({
        lastSuccessfulEventLabel: formatTimestampOrNull(policyRow.lastObservedAt),
        runtimeStatus:
          policyRow.runtimeStatus === "paused" ? "paused" : "degraded",
      }),
    );
  }

  if (
    syncRow &&
    (syncRow.status === "failed" || syncRow.status === "stalled")
  ) {
    cards.push(
      buildSyncStalledState({
        providerLabel: "Google Sheets",
        state: syncRow.status === "failed" ? "degraded" : "attention_needed",
        lastSuccessfulEventLabel: formatTimestampOrNull(syncRow.finishedAt),
      }),
    );
  }

  if (failedDelivery) {
    cards.push(
      buildDeliveryFailureState({
        approvalItemLabel: failedDelivery.approvalItemId,
      }),
    );
  }

  return cards;
}

export async function getBillingDisplayState(
  organizationId: string,
): Promise<BillingDisplayState | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      trialEndsAt: subscriptions.trialEndsAt,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    plan: titleCase(row.plan),
    status: titleCase(row.status),
    trialEndsAt: formatTimestampOrNull(row.trialEndsAt),
    currentPeriodEndsAt: formatTimestampOrNull(row.currentPeriodEndsAt),
  };
}

export async function getAccountDisplayState(
  organizationId: string,
): Promise<AccountDisplayState | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({
      workspaceLabel: organizations.workspaceLabel,
      businessName: organizations.name,
      workspaceStatus: organizations.status,
      ownerName: organizations.ownerName,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    workspaceLabel: row.workspaceLabel,
    businessName: row.businessName,
    workspaceStatus: titleCase(row.workspaceStatus),
    ownerName: row.ownerName,
    createdAt: format(row.createdAt, "MMM dd, yyyy"),
  };
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
      agentPolicy: {
        gmailSendEnabled: true,
        googleSheetsReadEnabled: true,
        killSwitchEnabled: false,
        runtimeStatus: "Pending",
        lastError: null,
      },
    };
  }

  const [[profile], channelRows, [policyRow]] = await Promise.all([
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
    db
      .select({
        desiredPolicy: agentPolicies.desiredPolicy,
        runtimeStatus: agentPolicies.runtimeStatus,
        lastError: agentPolicies.lastError,
      })
      .from(agentPolicies)
      .where(eq(agentPolicies.organizationId, organizationId))
      .limit(1),
  ]);

  const desiredPolicy = (policyRow?.desiredPolicy ?? {}) as {
    tools?: {
      gmailSend?: boolean;
      googleSheetsRead?: boolean;
    };
    automation?: {
      killSwitch?: boolean;
    };
  };

  return {
    toneGuidance: profile?.communicationTone ?? "",
    channelStates: channelRows.filter(
      (row): row is ChannelStateDisplayRow =>
        row.channel === "web" || row.channel === "email",
    ),
    agentPolicy: {
      gmailSendEnabled: desiredPolicy.tools?.gmailSend ?? true,
      googleSheetsReadEnabled: desiredPolicy.tools?.googleSheetsRead ?? true,
      killSwitchEnabled: desiredPolicy.automation?.killSwitch ?? false,
      runtimeStatus: titleCase(policyRow?.runtimeStatus ?? "pending"),
      lastError:
        typeof policyRow?.lastError === "string" ? policyRow.lastError : null,
    },
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
          id: connectedAccounts.id,
        })
        .from(connectedAccounts)
        .where(eq(connectedAccounts.organizationId, organizationId)),
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
