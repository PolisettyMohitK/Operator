import type { ApprovalStatus } from "@/lib/operator/domain/approval-policy";

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
