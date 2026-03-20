import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/operator/datalayer/viewer-context";
import {
  buildGoogleOAuthAuthorizationUrl,
  createGoogleOAuthStateCookie,
  getRequiredGoogleOAuthConfig,
  sanitizeOAuthReturnTo,
} from "@/lib/operator/oauth/google";
import { parseGoogleOAuthProvider } from "@/lib/operator/oauth/google-scopes";

function redirectWithStatus(request: Request, returnTo: string, oauth: string) {
  const target = new URL(sanitizeOAuthReturnTo(returnTo), request.url);
  target.searchParams.set("oauth", oauth);

  return NextResponse.redirect(target, { status: 302 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = parseGoogleOAuthProvider(url.searchParams.get("provider"));
  const returnTo = sanitizeOAuthReturnTo(url.searchParams.get("returnTo"));

  if (!provider) {
    return new Response("Unsupported Google OAuth provider.", { status: 400 });
  }

  const viewerContext = await getViewerContext();

  if (!viewerContext || viewerContext.role !== "owner") {
    return redirectWithStatus(request, returnTo, "owner_required");
  }

  try {
    const config = getRequiredGoogleOAuthConfig(process.env);
    const state = createGoogleOAuthStateCookie({
      membershipId: viewerContext.membershipId,
      organizationId: viewerContext.organizationId,
      provider,
      returnTo,
    });
    const response = NextResponse.redirect(
      buildGoogleOAuthAuthorizationUrl({
        codeVerifier: state.payload.codeVerifier,
        config,
        provider,
        state: state.payload.nonce,
      }),
      { status: 302 },
    );

    response.headers.append("Set-Cookie", state.setCookieHeader);
    return response;
  } catch {
    return redirectWithStatus(request, returnTo, "config_missing");
  }
}
