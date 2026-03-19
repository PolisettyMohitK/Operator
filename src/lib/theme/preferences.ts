export type ThemePreference = "light" | "dark" | "system";
export type ResolvedThemeValue = "light" | "dark";

export function resolveThemePreference(value?: string | null): ThemePreference {
  switch (value) {
    case "light":
    case "dark":
    case "system":
      return value;
    default:
      return "system";
  }
}

export function resolveThemeValue(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedThemeValue {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}
