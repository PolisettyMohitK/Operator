export type GoogleOAuthProvider = "gmail" | "google_sheets";

const BASE_GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

const GOOGLE_PROVIDER_SCOPES = {
  gmail: ["https://www.googleapis.com/auth/gmail.send"],
  google_sheets: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
} as const satisfies Record<GoogleOAuthProvider, readonly string[]>;

export function parseGoogleOAuthProvider(
  value: string | null | undefined,
): GoogleOAuthProvider | null {
  if (value === "gmail" || value === "google_sheets") {
    return value;
  }

  return null;
}

export function getGoogleOAuthScopes(provider: GoogleOAuthProvider) {
  return [...BASE_GOOGLE_SCOPES, ...GOOGLE_PROVIDER_SCOPES[provider]];
}
