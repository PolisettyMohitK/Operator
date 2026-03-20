import type { ApprovalStatus } from "@/lib/operator/domain/approval-policy";

export type ProviderConnectionLifecycleInput = Readonly<{
  provider: "gmail" | "google_sheets";
  status:
    | "pending"
    | "connected"
    | "reconnect_required"
    | "disconnected"
    | "error";
  externalAccountLabel: string | null;
  reconnectReason: string | null;
  lastSuccessfulSyncAt: Date | null;
  updatedAt: Date;
}>;

export type ProviderConnectionDisplayRow = Readonly<{
  provider: "gmail" | "google_sheets";
  name: string;
  state: "healthy" | "attention_needed" | "degraded" | "paused";
  status: string;
  detail: string;
  accountLabel: string | null;
  lastSuccessfulSyncAt: Date | null;
  isConnected: boolean;
}>;

export function formatQueueChannelLabel(channel: "web" | "email" | "whatsapp") {
  switch (channel) {
    case "email":
      return "Gmail";
    case "whatsapp":
      return "WhatsApp";
    default:
      return "Web";
  }
}

export function summarizeInvoiceChannels(
  channels: Array<"web" | "email" | "whatsapp">,
) {
  if (channels.length === 0) {
    return "Web";
  }

  const order = ["email", "whatsapp", "web"] as const;
  const uniqueChannels = Array.from(new Set(channels)).sort(
    (left, right) => order.indexOf(left) - order.indexOf(right),
  );

  const labels = uniqueChannels.map((channel) => {
    switch (channel) {
      case "email":
        return "Email";
      case "whatsapp":
        return "WhatsApp";
      default:
        return "Web";
    }
  });

  return labels.join(" + ");
}

export function isApprovalFinalized(status: ApprovalStatus) {
  return ["approved", "rejected", "sent", "failed", "stale"].includes(status);
}

export function formatCompactUsdAmount(amount: number) {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return `$${amount.toLocaleString()}`;
}

export function formatMetricCount(count: number) {
  return count.toString().padStart(2, "0");
}

export function formatActivityTimestamp(createdAt: Date, displayLabel?: string) {
  if (displayLabel?.trim()) {
    return displayLabel;
  }

  return createdAt.toISOString().slice(11, 16);
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getProviderName(provider: ProviderConnectionLifecycleInput["provider"]) {
  return provider === "gmail" ? "Gmail" : "Google Sheets";
}

function getProviderState(
  status: ProviderConnectionLifecycleInput["status"],
): ProviderConnectionDisplayRow["state"] {
  switch (status) {
    case "connected":
      return "healthy";
    case "pending":
      return "attention_needed";
    case "disconnected":
      return "paused";
    default:
      return "degraded";
  }
}

function getProviderDetail(row: ProviderConnectionLifecycleInput) {
  if (row.status === "connected" && row.externalAccountLabel) {
    return `Connected as ${row.externalAccountLabel}.`;
  }

  if (row.reconnectReason?.trim()) {
    return row.reconnectReason;
  }

  if (row.status === "pending") {
    return `Finish connecting ${getProviderName(row.provider)} to activate this workflow.`;
  }

  if (row.status === "disconnected") {
    return `${getProviderName(row.provider)} is disconnected for this workspace.`;
  }

  return `${getProviderName(row.provider)} requires attention before it can be used.`;
}

export function summarizeProviderConnections(
  rows: ProviderConnectionLifecycleInput[],
): ProviderConnectionDisplayRow[] {
  return [...rows]
    .sort((left, right) => {
      const providerOrder =
        (left.provider === "gmail" ? 0 : 1) - (right.provider === "gmail" ? 0 : 1);

      if (providerOrder !== 0) {
        return providerOrder;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .map((row) => ({
      provider: row.provider,
      name: getProviderName(row.provider),
      state: getProviderState(row.status),
      status: titleCase(row.status),
      detail: getProviderDetail(row),
      accountLabel: row.externalAccountLabel,
      lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
      isConnected: row.status === "connected",
    }));
}

export function countConnectedProviderConnections(
  rows: ReadonlyArray<{
    isConnected: boolean;
  }>,
) {
  return rows.filter((row) => row.isConnected).length;
}
