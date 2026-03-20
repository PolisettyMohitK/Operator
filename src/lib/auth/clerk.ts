type ClerkEnv = Readonly<Record<string, string | undefined>>;

type TeamRole = "owner" | "staff" | "approver";

export function hasClerkPublishableKey(env: ClerkEnv) {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function hasClerkServerCredentials(env: ClerkEnv) {
  return hasClerkPublishableKey(env) && Boolean(env.CLERK_SECRET_KEY?.trim());
}

export function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/ops" ||
    pathname.startsWith("/ops/")
  );
}

export function mapClerkRoleToTeamRole(clerkRole?: string | null): TeamRole {
  return clerkRole === "org:admin" ? "owner" : "staff";
}
