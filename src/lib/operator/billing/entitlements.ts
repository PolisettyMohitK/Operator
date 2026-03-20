import { eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  featureGates,
  organizations,
  subscriptions,
} from "@/lib/operator/db/schema";

export type WorkspaceEntitlements = Readonly<{
  organizationId: string;
  workspaceStatus: "draft" | "active" | "paused";
  subscriptionStatus:
    | "draft"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled";
  plan: "trial" | "personal" | null;
  invoiceRecoveryEnabled: boolean;
  advancedRuntimeEnabled: boolean;
  canAccessCoreProduct: boolean;
  canRunBackgroundExecution: boolean;
}>;

function isBillingActive(status: WorkspaceEntitlements["subscriptionStatus"]) {
  return status === "trialing" || status === "active";
}

export async function resolveWorkspaceEntitlements(
  organizationId: string,
): Promise<WorkspaceEntitlements> {
  const db = getDb();

  if (!db) {
    return {
      organizationId,
      workspaceStatus: "draft",
      subscriptionStatus: "draft",
      plan: null,
      invoiceRecoveryEnabled: false,
      advancedRuntimeEnabled: false,
      canAccessCoreProduct: false,
      canRunBackgroundExecution: false,
    };
  }

  const [organizationRows, subscriptionRows, featureGateRows] = await Promise.all([
    db
      .select({
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1),
    db
      .select({
        plan: subscriptions.plan,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1),
    db
      .select({
        key: featureGates.key,
        enabled: featureGates.enabled,
      })
      .from(featureGates)
      .where(eq(featureGates.organizationId, organizationId)),
  ]);

  const organization = organizationRows[0];
  const subscription = subscriptionRows[0];
  const gateMap = new Map(featureGateRows.map((row) => [row.key, row.enabled]));

  const workspaceStatus = organization?.status ?? "draft";
  const subscriptionStatus = subscription?.status ?? "draft";
  const plan = subscription?.plan ?? null;
  const invoiceRecoveryEnabled = gateMap.get("invoice_recovery") === true;
  const advancedRuntimeEnabled = gateMap.get("advanced_runtime") === true;
  const canAccessCoreProduct =
    workspaceStatus === "active" &&
    isBillingActive(subscriptionStatus) &&
    invoiceRecoveryEnabled;

  return {
    organizationId,
    workspaceStatus,
    subscriptionStatus,
    plan,
    invoiceRecoveryEnabled,
    advancedRuntimeEnabled,
    canAccessCoreProduct,
    canRunBackgroundExecution: canAccessCoreProduct,
  };
}

export function assertInvoiceRecoveryExecutionAllowed(
  entitlements: WorkspaceEntitlements,
) {
  if (!entitlements.canRunBackgroundExecution) {
    throw new Error(
      "Workspace is not currently entitled to run invoice recovery execution.",
    );
  }
}
