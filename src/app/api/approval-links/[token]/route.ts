import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { mutateApprovalItemWithMembership } from "@/lib/operator/datalayer/approval-mutations";
import { verifyApprovalActionToken } from "@/lib/operator/delivery/approval-links";
import { getDb } from "@/lib/operator/db/client";
import { deliveryAttempts } from "@/lib/operator/db/schema";
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
    const db = getDb();

    if (!db) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const [attempt] = await db
      .select({
        approvalItemId: deliveryAttempts.approvalItemId,
        channel: deliveryAttempts.channel,
        responseMetadata: deliveryAttempts.responseMetadata,
        state: deliveryAttempts.state,
      })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.id, payload.deliveryAttemptId))
      .limit(1);

    const membershipId =
      typeof attempt?.responseMetadata.membershipId === "string"
        ? attempt.responseMetadata.membershipId
        : null;
    const organizationId =
      typeof attempt?.responseMetadata.organizationId === "string"
        ? attempt.responseMetadata.organizationId
        : null;

    if (
      !attempt ||
      attempt.approvalItemId !== payload.approvalItemId ||
      attempt.channel !== payload.channel ||
      attempt.state === "prompt_failed" ||
      !membershipId ||
      !organizationId
    ) {
      throw new Error("Approval delivery attempt is invalid.");
    }

    await mutateApprovalItemWithMembership({
      action: payload.action,
      actorMembershipId: membershipId,
      approvalItemId: payload.approvalItemId,
      origin: payload.channel,
      organizationId,
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
