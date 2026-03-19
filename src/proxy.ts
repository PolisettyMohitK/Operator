import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

import { hasClerkServerCredentials, isProtectedAppPath } from "@/lib/auth/clerk";

const clerkAuthProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedAppPath(request.nextUrl.pathname)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasClerkServerCredentials(process.env)) {
    return NextResponse.next();
  }

  return clerkAuthProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
