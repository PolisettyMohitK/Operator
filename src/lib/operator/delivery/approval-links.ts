import { createHmac, timingSafeEqual } from "node:crypto";

export type ApprovalLinkAction = "approve" | "reject";
export type ApprovalLinkChannel = "email" | "whatsapp";

export type ApprovalActionTokenPayload = Readonly<{
  action: ApprovalLinkAction;
  approvalItemId: string;
  channel: ApprovalLinkChannel;
  deliveryAttemptId: string;
  expiresAt: string;
}>;

function encodePayload(payload: ApprovalActionTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(payload: string) {
  return JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as Partial<ApprovalActionTokenPayload>;
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function assertSignature(tokenSignature: string, expectedSignature: string) {
  const signatureBuffer = Buffer.from(tokenSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid approval link signature.");
  }
}

function assertTokenPayload(
  payload: Partial<ApprovalActionTokenPayload>,
): asserts payload is ApprovalActionTokenPayload {
  if (payload.action !== "approve" && payload.action !== "reject") {
    throw new Error("Invalid approval action.");
  }

  if (payload.channel !== "email" && payload.channel !== "whatsapp") {
    throw new Error("Invalid approval channel.");
  }

  if (
    !payload.approvalItemId ||
    !payload.deliveryAttemptId ||
    !payload.expiresAt
  ) {
    throw new Error("Approval link payload is incomplete.");
  }
}

export function createApprovalActionToken(
  payload: ApprovalActionTokenPayload,
  secret: string,
) {
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyApprovalActionToken(
  token: string,
  secret: string,
  now = new Date(),
) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Approval link token is malformed.");
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  assertSignature(signature, expectedSignature);

  const payload = decodePayload(encodedPayload);
  assertTokenPayload(payload);

  if (Number.isNaN(Date.parse(payload.expiresAt))) {
    throw new Error("Approval link expiry is invalid.");
  }

  if (new Date(payload.expiresAt).getTime() <= now.getTime()) {
    throw new Error("Approval link has expired.");
  }

  return payload;
}

export function buildApprovalActionUrl(input: {
  appUrl: string;
  token: string;
}) {
  const url = new URL(
    `/api/approval-links/${input.token}`,
    input.appUrl.endsWith("/") ? input.appUrl : `${input.appUrl}/`,
  );

  return url.toString();
}
