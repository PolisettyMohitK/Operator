import { describe, expect, it } from "vitest";

import { canAccessOpsSurface } from "@/lib/operator/ops/access";

describe("canAccessOpsSurface", () => {
  it("allows explicitly allowlisted users", () => {
    expect(
      canAccessOpsSurface({
        nodeEnv: "production",
        opsUserIds: ["user_ops"],
        viewerRole: "staff",
        viewerUserId: "user_ops",
      }),
    ).toBe(true);
  });

  it("allows owners in non-production when no allowlist is configured", () => {
    expect(
      canAccessOpsSurface({
        nodeEnv: "development",
        opsUserIds: [],
        viewerRole: "owner",
        viewerUserId: "user_owner",
      }),
    ).toBe(true);
  });

  it("blocks non-allowlisted users in production", () => {
    expect(
      canAccessOpsSurface({
        nodeEnv: "production",
        opsUserIds: ["user_ops"],
        viewerRole: "owner",
        viewerUserId: "user_owner",
      }),
    ).toBe(false);
  });
});
