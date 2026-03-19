type ClerkEnv = Readonly<Record<string, string | undefined>>;

export function hasClerkPublishableKey(env: ClerkEnv) {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function hasClerkServerCredentials(env: ClerkEnv) {
  return hasClerkPublishableKey(env) && Boolean(env.CLERK_SECRET_KEY?.trim());
}

export function isProtectedAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}
