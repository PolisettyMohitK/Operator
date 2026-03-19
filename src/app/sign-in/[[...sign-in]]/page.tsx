import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { hasClerkPublishableKey } from "@/lib/auth/clerk";
import { clerkAppearance } from "@/lib/auth/appearance";

export default function SignInPage() {
  if (!hasClerkPublishableKey(process.env)) {
    return (
      <AuthFrame
        eyebrow="Sign in"
        title="Operator account access"
        description="Clerk is the auth boundary for the real build. Add the publishable key and secret key locally to activate the live sign-in flow."
      >
        <div className="w-full">
          <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
            Clerk credentials are not available in this environment yet, so the
            production sign-in component is intentionally disabled.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href="/join-alpha">Request alpha access</Link>
            </Button>
            <Button asChild variant="secondary" className="sm:flex-1">
              <Link href="/">Back to site</Link>
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Operator account access"
      description="Sign in to review approvals, monitor overdue cash, and control the Operator workflow from one protected room."
    >
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
        signUpUrl="/sign-up"
      />
    </AuthFrame>
  );
}
