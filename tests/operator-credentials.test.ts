import { describe, expect, it } from "vitest";

import {
  decryptCredentialEnvelope,
  encryptCredentialEnvelope,
  parseProviderCredentialPayload,
  serializeProviderCredentialPayload,
} from "@/lib/operator/credentials/store";

describe("provider credential storage", () => {
  it("round-trips provider credentials through an encrypted envelope", () => {
    const payload = serializeProviderCredentialPayload({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scopes: ["gmail.send", "sheets.readonly"],
      tokenType: "Bearer",
      expiresAt: "2026-03-22T08:00:00.000Z",
    });

    const envelope = encryptCredentialEnvelope(payload, "local-dev-secret");
    const decryptedPayload = decryptCredentialEnvelope(
      envelope,
      "local-dev-secret",
    );

    expect(parseProviderCredentialPayload(decryptedPayload)).toEqual({
      accessToken: "access-token",
      expiresAt: "2026-03-22T08:00:00.000Z",
      refreshToken: "refresh-token",
      scopes: ["gmail.send", "sheets.readonly"],
      tokenType: "Bearer",
    });
  });

  it("rejects decryption with the wrong secret", () => {
    const payload = serializeProviderCredentialPayload({
      accessToken: "access-token",
      scopes: ["gmail.send"],
    });
    const envelope = encryptCredentialEnvelope(payload, "correct-secret");

    expect(() =>
      decryptCredentialEnvelope(envelope, "wrong-secret"),
    ).toThrow("Unable to decrypt provider credentials");
  });
});
