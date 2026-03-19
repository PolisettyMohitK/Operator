import { describe, expect, it } from "vitest";

import {
  hasClerkPublishableKey,
  hasClerkServerCredentials,
  isProtectedAppPath,
} from "@/lib/auth/clerk";

describe("hasClerkPublishableKey", () => {
  it("returns true when a publishable key is present", () => {
    expect(
      hasClerkPublishableKey({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      }),
    ).toBe(true);
  });

  it("returns false when a publishable key is missing", () => {
    expect(hasClerkPublishableKey({})).toBe(false);
  });
});

describe("hasClerkServerCredentials", () => {
  it("requires both the publishable and secret keys", () => {
    expect(
      hasClerkServerCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        CLERK_SECRET_KEY: "sk_test_123",
      }),
    ).toBe(true);
  });

  it("returns false when the secret key is missing", () => {
    expect(
      hasClerkServerCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      }),
    ).toBe(false);
  });
});

describe("isProtectedAppPath", () => {
  it("protects the app index and nested app routes", () => {
    expect(isProtectedAppPath("/app")).toBe(true);
    expect(isProtectedAppPath("/app/queue")).toBe(true);
    expect(isProtectedAppPath("/app/settings/team")).toBe(true);
  });

  it("leaves marketing and auth routes public", () => {
    expect(isProtectedAppPath("/")).toBe(false);
    expect(isProtectedAppPath("/pricing")).toBe(false);
    expect(isProtectedAppPath("/sign-in")).toBe(false);
    expect(isProtectedAppPath("/application")).toBe(false);
  });
});
