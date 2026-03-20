import { desc, eq, inArray } from "drizzle-orm";
import { format } from "date-fns";

import { getDb } from "@/lib/operator/db/client";
import {
  agentPolicies,
  approvalItems,
  connectedAccounts,
  deliveryAttempts,
  featureGates,
  invoices,
  organizations,
  subscriptions,
  syncRuns,
} from "@/lib/operator/db/schema";
import { getWorkspaceHealthCards } from "@/lib/operator/db/queries";

type ConnectedAccountSummary = Readonly<{
  provider: string;
  status: string;
  lastSuccessfulEventLabel: string | null;
}>;

export type OpsWorkspaceSummary = Readonly<{
  organizationId: string;
  businessName: string;
  workspaceStatus: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  pendingApprovalsCount: number;
  approvedWaitingDeliveryCount: number;
  failedDeliveryCount: number;
  runtimeStatus: string;
  killSwitchEnabled: boolean;
  lastDegradedStateLabel: string;
  connectedAccounts: ConnectedAccountSummary[];
  invoiceRecoveryEnabled: boolean;
}>;

export type OpsSyncRunRow = Readonly<{
  id: string;
  organizationId: string;
  businessName: string;
  status: string;
  detail: string;
  startedAt: string;
  finishedAt: string | null;
}>;

export type OpsDeliveryAttemptRow = Readonly<{
  id: string;
  organizationId: string;
  businessName: string;
  invoiceCode: string;
  clientName: string;
  state: string;
  channel: string;
  createdAt: string;
}>;

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatTimestamp(value: Date | null | undefined) {
  return value ? format(value, "MMM dd, HH:mm") : null;
}

export async function listOpsWorkspaceSummaries(): Promise<OpsWorkspaceSummary[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const organizationRows = await db
    .select({
      id: organizations.id,
      businessName: organizations.name,
      workspaceStatus: organizations.status,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  if (organizationRows.length === 0) {
    return [];
  }

  const organizationIds = organizationRows.map((row) => row.id);
  const [subscriptionRows, policyRows, connectedAccountRows, approvalRows, deliveryRows, featureGateRows] =
    await Promise.all([
      db
        .select({
          organizationId: subscriptions.organizationId,
          plan: subscriptions.plan,
          status: subscriptions.status,
        })
        .from(subscriptions)
        .where(inArray(subscriptions.organizationId, organizationIds)),
      db
        .select({
          organizationId: agentPolicies.organizationId,
          runtimeStatus: agentPolicies.runtimeStatus,
          desiredPolicy: agentPolicies.desiredPolicy,
        })
        .from(agentPolicies)
        .where(inArray(agentPolicies.organizationId, organizationIds)),
      db
        .select({
          organizationId: connectedAccounts.organizationId,
          provider: connectedAccounts.provider,
          status: connectedAccounts.status,
          lastSuccessfulSyncAt: connectedAccounts.lastSuccessfulSyncAt,
        })
        .from(connectedAccounts)
        .where(inArray(connectedAccounts.organizationId, organizationIds)),
      db
        .select({
          organizationId: approvalItems.organizationId,
          status: approvalItems.status,
        })
        .from(approvalItems)
        .where(inArray(approvalItems.organizationId, organizationIds)),
      db
        .select({
          organizationId: approvalItems.organizationId,
          state: deliveryAttempts.state,
        })
        .from(deliveryAttempts)
        .innerJoin(
          approvalItems,
          eq(deliveryAttempts.approvalItemId, approvalItems.id),
        )
        .where(inArray(approvalItems.organizationId, organizationIds)),
      db
        .select({
          organizationId: featureGates.organizationId,
          key: featureGates.key,
          enabled: featureGates.enabled,
        })
        .from(featureGates)
        .where(inArray(featureGates.organizationId, organizationIds)),
    ]);

  const subscriptionsByOrg = new Map(
    subscriptionRows.map((row) => [row.organizationId, row]),
  );
  const policyByOrg = new Map(policyRows.map((row) => [row.organizationId, row]));
  const accountsByOrg = new Map<string, ConnectedAccountSummary[]>();
  const approvalCountsByOrg = new Map<
    string,
    {
      pendingApprovalsCount: number;
      approvedWaitingDeliveryCount: number;
    }
  >();
  const failedDeliveriesByOrg = new Map<string, number>();
  const featureGateMapByOrg = new Map<string, Map<string, boolean>>();

  for (const row of connectedAccountRows) {
    const existing = accountsByOrg.get(row.organizationId) ?? [];
    existing.push({
      provider: row.provider === "gmail" ? "Gmail" : "Google Sheets",
      status: titleCase(row.status),
      lastSuccessfulEventLabel: formatTimestamp(row.lastSuccessfulSyncAt),
    });
    accountsByOrg.set(row.organizationId, existing);
  }

  for (const row of approvalRows) {
    const existing = approvalCountsByOrg.get(row.organizationId) ?? {
      pendingApprovalsCount: 0,
      approvedWaitingDeliveryCount: 0,
    };

    if (row.status === "pending" || row.status === "edited") {
      existing.pendingApprovalsCount += 1;
    }

    if (row.status === "approved") {
      existing.approvedWaitingDeliveryCount += 1;
    }

    approvalCountsByOrg.set(row.organizationId, existing);
  }

  for (const row of deliveryRows) {
    if (row.state === "failed") {
      failedDeliveriesByOrg.set(
        row.organizationId,
        (failedDeliveriesByOrg.get(row.organizationId) ?? 0) + 1,
      );
    }
  }

  for (const row of featureGateRows) {
    const existing = featureGateMapByOrg.get(row.organizationId) ?? new Map();
    existing.set(row.key, row.enabled);
    featureGateMapByOrg.set(row.organizationId, existing);
  }

  const degradedStateByOrg = new Map<string, string>();
  await Promise.all(
    organizationIds.map(async (organizationId) => {
      const healthCards = await getWorkspaceHealthCards(organizationId);
      degradedStateByOrg.set(
        organizationId,
        healthCards[0]
          ? `${titleCase(healthCards[0].state)} - ${healthCards[0].subject}`
          : "Healthy",
      );
    }),
  );

  return organizationRows.map((row) => {
    const subscription = subscriptionsByOrg.get(row.id);
    const policy = policyByOrg.get(row.id);
    const desiredPolicy = (policy?.desiredPolicy ?? {}) as {
      automation?: {
        killSwitch?: boolean;
      };
    };
    const queueCounts = approvalCountsByOrg.get(row.id) ?? {
      pendingApprovalsCount: 0,
      approvedWaitingDeliveryCount: 0,
    };

    return {
      organizationId: row.id,
      businessName: row.businessName,
      workspaceStatus: titleCase(row.workspaceStatus),
      subscriptionPlan: subscription ? titleCase(subscription.plan) : "None",
      subscriptionStatus: subscription ? titleCase(subscription.status) : "None",
      pendingApprovalsCount: queueCounts.pendingApprovalsCount,
      approvedWaitingDeliveryCount: queueCounts.approvedWaitingDeliveryCount,
      failedDeliveryCount: failedDeliveriesByOrg.get(row.id) ?? 0,
      runtimeStatus: policy ? titleCase(policy.runtimeStatus) : "Pending",
      killSwitchEnabled: desiredPolicy.automation?.killSwitch === true,
      lastDegradedStateLabel: degradedStateByOrg.get(row.id) ?? "Healthy",
      connectedAccounts: accountsByOrg.get(row.id) ?? [],
      invoiceRecoveryEnabled:
        featureGateMapByOrg.get(row.id)?.get("invoice_recovery") === true,
    };
  });
}

export async function listOpsSyncRuns(limit = 12): Promise<OpsSyncRunRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: syncRuns.id,
      organizationId: syncRuns.organizationId,
      businessName: organizations.name,
      status: syncRuns.status,
      detail: syncRuns.detail,
      startedAt: syncRuns.startedAt,
      finishedAt: syncRuns.finishedAt,
    })
    .from(syncRuns)
    .innerJoin(organizations, eq(syncRuns.organizationId, organizations.id))
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    businessName: row.businessName,
    status: titleCase(row.status),
    detail: row.detail,
    startedAt: format(row.startedAt, "MMM dd, HH:mm"),
    finishedAt: formatTimestamp(row.finishedAt),
  }));
}

export async function listOpsDeliveryAttempts(
  limit = 12,
): Promise<OpsDeliveryAttemptRow[]> {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select({
      id: deliveryAttempts.id,
      organizationId: approvalItems.organizationId,
      businessName: organizations.name,
      invoiceCode: invoices.invoiceId,
      clientName: invoices.clientName,
      state: deliveryAttempts.state,
      channel: deliveryAttempts.channel,
      createdAt: deliveryAttempts.createdAt,
    })
    .from(deliveryAttempts)
    .innerJoin(
      approvalItems,
      eq(deliveryAttempts.approvalItemId, approvalItems.id),
    )
    .innerJoin(invoices, eq(approvalItems.invoiceId, invoices.id))
    .innerJoin(organizations, eq(approvalItems.organizationId, organizations.id))
    .orderBy(desc(deliveryAttempts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    businessName: row.businessName,
    invoiceCode: row.invoiceCode,
    clientName: row.clientName,
    state: titleCase(row.state),
    channel: titleCase(row.channel),
    createdAt: format(row.createdAt, "MMM dd, HH:mm"),
  }));
}
