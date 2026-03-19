export type TeamRole = "owner" | "staff" | "approver";
export type ApprovalChannel = "web" | "email" | "whatsapp";
export type ApprovalStatus =
  | "pending"
  | "edited"
  | "approved"
  | "rejected"
  | "sent"
  | "failed"
  | "stale";

export type TeamMember = Readonly<{
  id: string;
  name: string;
  role: TeamRole;
  canApprove?: boolean;
}>;

export type ApprovalItem = Readonly<{
  id: string;
  invoiceId: string;
  status: ApprovalStatus;
  channel: ApprovalChannel;
  approvedBy?: string;
  rejectedBy?: string;
}>;

export function canApproveOutboundMessage(member: TeamMember) {
  return (
    member.role === "owner" ||
    member.role === "approver" ||
    member.canApprove === true
  );
}

export function advanceApprovalItem(
  item: ApprovalItem,
  actor: TeamMember,
  action: "approve" | "reject",
): ApprovalItem {
  if (action === "approve" && !canApproveOutboundMessage(actor)) {
    throw new Error("Actor is not allowed to approve outbound messages.");
  }

  if (action === "approve" && item.status === "approved") {
    return item;
  }

  if (action === "reject" && item.status === "rejected") {
    return item;
  }

  if (!["pending", "edited"].includes(item.status)) {
    throw new Error("Only pending or edited items can change state.");
  }

  if (action === "approve") {
    return {
      ...item,
      status: "approved",
      approvedBy: actor.id,
    };
  }

  return {
    ...item,
    status: "rejected",
    rejectedBy: actor.id,
  };
}
