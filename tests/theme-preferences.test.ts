import { describe, expect, it } from "vitest";

import {
  resolveThemePreference,
  resolveThemeValue,
} from "@/lib/theme/preferences";

describe("resolveThemePreference", () => {
  it("accepts the supported theme preferences", () => {
    expect(resolveThemePreference("light")).toBe("light");
    expect(resolveThemePreference("dark")).toBe("dark");
    expect(resolveThemePreference("system")).toBe("system");
  });

  it("falls back to system for unsupported values", () => {
    expect(resolveThemePreference("sepia")).toBe("system");
    expect(resolveThemePreference(undefined)).toBe("system");
  });
});

describe("resolveThemeValue", () => {
  it("uses the explicit theme when one is selected", () => {
    expect(resolveThemeValue("light", true)).toBe("light");
    expect(resolveThemeValue("dark", false)).toBe("dark");
  });

  it("uses the system preference when the preference is system", () => {
    expect(resolveThemeValue("system", true)).toBe("dark");
    expect(resolveThemeValue("system", false)).toBe("light");
  });
});
