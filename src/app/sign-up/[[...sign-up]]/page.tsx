import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { hasClerkPublishableKey } from "@/lib/auth/clerk";
import { clerkAppearance } from "@/lib/auth/appearance";

export default function SignUpPage() {
  if (!hasClerkPublishableKey(process.env)) {
    return (
      <AuthFrame
        eyebrow="Join alpha"
        title="Create your Operator account"
        description="The live Clerk sign-up flow activates once the local auth credentials are present."
      >
        <div className="w-full">
          <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
            Sign-up is currently disabled because Clerk credentials are not
            available in this environment.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <Link href="/join-alpha">Request alpha access</Link>
            </Button>
            <Button asChild variant="secondary" className="sm:flex-1">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      eyebrow="Join alpha"
      title="Create your Operator account"
      description="Start the closed-alpha setup flow for the business owner who will connect the revenue stack and assign approvers."
    >
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl="/app"
        signInFallbackRedirectUrl="/app"
        signInUrl="/sign-in"
      />
    </AuthFrame>
  );
}
