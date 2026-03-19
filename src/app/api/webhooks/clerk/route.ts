import type { WebhookEvent } from "@clerk/backend";
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

import { processClerkWebhookEvent } from "@/lib/operator/webhooks/clerk";
import { getClerkWebhookSecret } from "@/lib/operator/integrations/env";

export const dynamic = "force-dynamic";

const clerkWebhook = new Webhook(getClerkWebhookSecret(process.env));

function getWebhookHeaders(request: Request) {
  return {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };
}

export async function POST(request: Request) {
  const payload = await request.text();

  let event: WebhookEvent;

  try {
    event = clerkWebhook.verify(payload, getWebhookHeaders(request)) as WebhookEvent;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "invalid_signature",
          message: "Clerk webhook signature verification failed.",
        },
      },
      { status: 400 },
    );
  }

  try {
    await processClerkWebhookEvent(event);

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "webhook_processing_failed",
          message:
            error instanceof Error ? error.message : "Failed to process Clerk webhook.",
        },
      },
      { status: 500 },
    );
  }
}
