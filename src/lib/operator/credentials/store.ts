import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { z } from "zod";

const providerCredentialPayloadSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).default([]),
  tokenType: z.string().default("Bearer"),
});

const credentialEnvelopeSchema = z.object({
  algorithm: z.literal("aes-256-gcm"),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  keyVersion: z.literal("v1"),
  tag: z.string().min(1),
});

export type ProviderCredentialPayload = z.infer<
  typeof providerCredentialPayloadSchema
>;

export type CredentialEnvelope = z.infer<typeof credentialEnvelopeSchema>;

function deriveEncryptionKey(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function serializeProviderCredentialPayload(
  payload: ProviderCredentialPayload,
) {
  return JSON.stringify(providerCredentialPayloadSchema.parse(payload));
}

export function parseProviderCredentialPayload(payload: string) {
  return providerCredentialPayloadSchema.parse(JSON.parse(payload));
}

export function encryptCredentialEnvelope(payload: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);

  return credentialEnvelopeSchema.parse({
    algorithm: "aes-256-gcm",
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    keyVersion: "v1",
    tag: cipher.getAuthTag().toString("base64"),
  });
}

export function decryptCredentialEnvelope(
  envelope: CredentialEnvelope,
  secret: string,
) {
  try {
    const parsedEnvelope = credentialEnvelopeSchema.parse(envelope);
    const decipher = createDecipheriv(
      parsedEnvelope.algorithm,
      deriveEncryptionKey(secret),
      Buffer.from(parsedEnvelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(parsedEnvelope.tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(parsedEnvelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Unable to decrypt provider credentials.");
  }
}
