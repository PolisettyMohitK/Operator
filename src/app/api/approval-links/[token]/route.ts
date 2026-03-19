import { NextResponse } from "next/server";

import { mutateApprovalItemWithMembership } from "@/lib/operator/datalayer/approval-mutations";
import { verifyApprovalActionToken } from "@/lib/operator/delivery/approval-links";
import {
  getApprovalLinkSecret,
  getOperatorAppUrl,
} from "@/lib/operator/integrations/env";

export const dynamic = "force-dynamic";

function buildRedirectUrl(request: Request, status: string, approvalItemId?: string) {
  const appUrl = getOperatorAppUrl(process.env) ?? new URL(request.url).origin;
  const redirectUrl = new URL("/app/queue", appUrl);
  redirectUrl.searchParams.set("approvalStatus", status);

  if (approvalItemId) {
    redirectUrl.searchParams.set("approvalItemId", approvalItemId);
  }

  return redirectUrl;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const secret = getApprovalLinkSecret(process.env);

  if (!secret) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "missing-secret"),
      { status: 303 },
    );
  }

  try {
    const payload = verifyApprovalActionToken(token, secret);

    await mutateApprovalItemWithMembership({
      action: payload.action,
      actorMembershipId: payload.actorMembershipId,
      approvalItemId: payload.approvalItemId,
      origin: payload.channel,
      organizationId: payload.organizationId,
    });

    return NextResponse.redirect(
      buildRedirectUrl(request, payload.action, payload.approvalItemId),
      { status: 303 },
    );
  } catch {
    return NextResponse.redirect(
      buildRedirectUrl(request, "invalid-link"),
      { status: 303 },
    );
  }
}
