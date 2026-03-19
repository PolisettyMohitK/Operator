import { describe, expect, it } from "vitest";

import { getDatabaseUrl } from "@/lib/operator/db/client";

describe("getDatabaseUrl", () => {
  it("reads DATABASE_URL from the env object passed at call time", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgresql://example",
      }),
    ).toBe("postgresql://example");
  });

  it("returns null when DATABASE_URL is missing or blank", () => {
    expect(getDatabaseUrl({})).toBeNull();
    expect(
      getDatabaseUrl({
        DATABASE_URL: "   ",
      }),
    ).toBeNull();
  });
});
