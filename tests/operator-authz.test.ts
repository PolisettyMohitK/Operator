import { describe, expect, it } from "vitest";

import { mapClerkRoleToTeamRole } from "@/lib/auth/clerk";
import {
  allowsImplicitWorkspaceProvisioning,
  assertApprovalMutationAccess,
  shouldAutoClaimSeedWorkspace,
} from "@/lib/operator/datalayer/viewer-context";

describe("mapClerkRoleToTeamRole", () => {
  it("treats Clerk organization admins as Operator owners", () => {
    expect(mapClerkRoleToTeamRole("org:admin")).toBe("owner");
  });

  it("falls back to staff for unknown or member roles", () => {
    expect(mapClerkRoleToTeamRole("org:member")).toBe("staff");
    expect(mapClerkRoleToTeamRole("something-custom")).toBe("staff");
    expect(mapClerkRoleToTeamRole(null)).toBe("staff");
  });
});

describe("shouldAutoClaimSeedWorkspace", () => {
  it("only allows the dev seed workspace to be auto-claimed in non-production when it is the only workspace", () => {
    expect(
      shouldAutoClaimSeedWorkspace({
        nodeEnv: "development",
        organizationCount: 1,
        seededMembershipCount: 3,
        realMembershipCount: 0,
      }),
    ).toBe(true);
  });

  it("rejects auto-claim when production is running or a real membership already exists", () => {
    expect(
      shouldAutoClaimSeedWorkspace({
        nodeEnv: "production",
        organizationCount: 1,
        seededMembershipCount: 3,
        realMembershipCount: 0,
      }),
    ).toBe(false);

    expect(
      shouldAutoClaimSeedWorkspace({
        nodeEnv: "development",
        organizationCount: 1,
        seededMembershipCount: 2,
        realMembershipCount: 1,
      }),
    ).toBe(false);
  });
});

describe("allowsImplicitWorkspaceProvisioning", () => {
  it("keeps implicit workspace creation available in non-production only", () => {
    expect(allowsImplicitWorkspaceProvisioning("development")).toBe(true);
    expect(allowsImplicitWorkspaceProvisioning("test")).toBe(true);
    expect(allowsImplicitWorkspaceProvisioning("production")).toBe(false);
  });
});

describe("assertApprovalMutationAccess", () => {
  it("allows an approver to mutate an approval item in their own organization", () => {
    expect(() =>
      assertApprovalMutationAccess({
        viewerOrganizationId: "org_1",
        viewerCanApprove: true,
        targetOrganizationId: "org_1",
      }),
    ).not.toThrow();
  });

  it("blocks cross-organization approval attempts", () => {
    expect(() =>
      assertApprovalMutationAccess({
        viewerOrganizationId: "org_1",
        viewerCanApprove: true,
        targetOrganizationId: "org_2",
      }),
    ).toThrow("outside the active workspace");
  });

  it("blocks members without approval authority", () => {
    expect(() =>
      assertApprovalMutationAccess({
        viewerOrganizationId: "org_1",
        viewerCanApprove: false,
        targetOrganizationId: "org_1",
      }),
    ).toThrow("not allowed");
  });
});
