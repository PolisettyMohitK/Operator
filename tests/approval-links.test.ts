import { describe, expect, it } from "vitest";

import {
  buildApprovalActionUrl,
  createApprovalActionToken,
  verifyApprovalActionToken,
} from "@/lib/operator/delivery/approval-links";

const secret = "top-secret";

describe("approval action tokens", () => {
  it("round-trips a signed token", () => {
    const token = createApprovalActionToken(
      {
        action: "approve",
        actorMembershipId: "membership_1",
        approvalItemId: "approval_1",
        channel: "email",
        expiresAt: "2030-03-19T12:00:00.000Z",
        organizationId: "org_1",
      },
      secret,
    );

    expect(verifyApprovalActionToken(token, secret)).toEqual({
      action: "approve",
      actorMembershipId: "membership_1",
      approvalItemId: "approval_1",
      channel: "email",
      expiresAt: "2030-03-19T12:00:00.000Z",
      organizationId: "org_1",
    });
  });

  it("rejects a tampered token", () => {
    const token = createApprovalActionToken(
      {
        action: "reject",
        actorMembershipId: "membership_1",
        approvalItemId: "approval_1",
        channel: "whatsapp",
        expiresAt: "2030-03-19T12:00:00.000Z",
        organizationId: "org_1",
      },
      secret,
    );

    expect(() =>
      verifyApprovalActionToken(`${token.slice(0, -1)}x`, secret),
    ).toThrow("Invalid approval link signature");
  });

  it("rejects an expired token", () => {
    const token = createApprovalActionToken(
      {
        action: "approve",
        actorMembershipId: "membership_1",
        approvalItemId: "approval_1",
        channel: "email",
        expiresAt: "2024-03-19T12:00:00.000Z",
        organizationId: "org_1",
      },
      secret,
    );

    expect(() => verifyApprovalActionToken(token, secret)).toThrow(
      "Approval link has expired",
    );
  });
});

describe("buildApprovalActionUrl", () => {
  it("embeds the token in the approval-links route", () => {
    expect(
      buildApprovalActionUrl({
        appUrl: "https://operator.example.com/",
        token: "signed-token",
      }),
    ).toBe("https://operator.example.com/api/approval-links/signed-token");
  });
});
