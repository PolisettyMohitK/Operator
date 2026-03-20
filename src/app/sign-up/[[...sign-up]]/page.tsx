import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/auth/appearance";
import { hasClerkPublishableKey } from "@/lib/auth/clerk";

export default function SignUpPage() {
  if (!hasClerkPublishableKey(process.env)) {
    return (
      <AuthFrame
        eyebrow="Start trial"
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
              <Link href="/join-alpha">Start setup</Link>
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
      eyebrow="Start trial"
      title="Create your Operator account"
      description="Start the paid setup flow for the business owner who will connect Gmail, map Google Sheets, and assign approvers."
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
