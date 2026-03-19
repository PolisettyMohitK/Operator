import { describe, expect, it } from "vitest";

import {
  advanceApprovalItem,
  canApproveOutboundMessage,
  type ApprovalItem,
  type TeamMember,
} from "@/lib/operator/domain/approval-policy";

const owner: TeamMember = {
  id: "owner_1",
  name: "Aarav",
  role: "owner",
};

const staff: TeamMember = {
  id: "staff_1",
  name: "Mina",
  role: "staff",
};

const approver: TeamMember = {
  id: "approver_1",
  name: "Rhea",
  role: "approver",
};

const pendingItem: ApprovalItem = {
  id: "approval_1",
  invoiceId: "INV-201",
  status: "pending",
  channel: "email",
};

describe("canApproveOutboundMessage", () => {
  it("allows owners and approvers to approve outbound messages", () => {
    expect(canApproveOutboundMessage(owner)).toBe(true);
    expect(canApproveOutboundMessage(approver)).toBe(true);
  });

  it("prevents regular staff from approving outbound messages", () => {
    expect(canApproveOutboundMessage(staff)).toBe(false);
  });
});

describe("advanceApprovalItem", () => {
  it("moves a pending item to approved when an approver acts", () => {
    const next = advanceApprovalItem(pendingItem, approver, "approve");

    expect(next.status).toBe("approved");
    expect(next.approvedBy).toBe("approver_1");
  });

  it("treats repeated approval actions as idempotent once the item is approved", () => {
    const approved = advanceApprovalItem(pendingItem, owner, "approve");
    const repeated = advanceApprovalItem(approved, owner, "approve");

    expect(repeated).toEqual(approved);
  });

  it("rejects a staff approval attempt", () => {
    expect(() => advanceApprovalItem(pendingItem, staff, "approve")).toThrow(
      "not allowed",
    );
  });
});
