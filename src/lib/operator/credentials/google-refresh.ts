import { eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import { accountTokens, connectedAccounts } from "@/lib/operator/db/schema";
import {
  encryptCredentialEnvelope,
  serializeProviderCredentialPayload,
} from "@/lib/operator/credentials/store";
import type { ResolvedConnectedAccountCredentials } from "@/lib/operator/credentials/resolver";
import { getRequiredGoogleOAuthConfig } from "@/lib/operator/oauth/google";
import { refreshGoogleAccessToken } from "@/lib/operator/oauth/google";

type RefreshableProvider = "gmail" | "google_sheets";

type CurrentGoogleCredentials = Readonly<{
  accessToken: string;
  expiresAt?: string;
  refreshToken?: string;
  scopes: string[];
  tokenType: string;
}>;

export async function refreshGoogleConnectedAccountCredentials(input: Readonly<{
  connectedAccountId: string;
  currentCredentials: CurrentGoogleCredentials;
  encryptionSecret: string;
  externalAccountId: string;
  externalAccountLabel: string;
  grantedScopes: string[];
  organizationId: string;
  provider: RefreshableProvider;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: typeof fetch;
}>): Promise<ResolvedConnectedAccountCredentials | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  if (!input.currentCredentials.refreshToken) {
    await db.transaction(async (tx) => {
      await tx
        .update(connectedAccounts)
        .set({
          reconnectReason:
            "Reconnect this Google account to restore access. No refresh token is stored for this workspace.",
          status: "reconnect_required",
          updatedAt: new Date(),
        })
        .where(eq(connectedAccounts.id, input.connectedAccountId));
    });

    return null;
  }

  const refreshResult = await refreshGoogleAccessToken({
    config: getRequiredGoogleOAuthConfig(input.env ?? process.env),
    fetchImpl: input.fetchImpl,
    refreshToken: input.currentCredentials.refreshToken,
  });

  if (!refreshResult.ok) {
    if (refreshResult.error.code === "invalid_grant") {
      await db.transaction(async (tx) => {
        await tx
          .update(connectedAccounts)
          .set({
            reconnectReason:
              "Reconnect this Google account to restore access. Google revoked or expired the refresh token.",
            status: "reconnect_required",
            updatedAt: new Date(),
          })
          .where(eq(connectedAccounts.id, input.connectedAccountId));
      });

      return null;
    }

    throw new Error(refreshResult.error.message);
  }

  const expiresAt = refreshResult.value.expiresIn
    ? new Date(Date.now() + refreshResult.value.expiresIn * 1000)
    : null;
  const mergedScopes =
    refreshResult.value.scopes.length > 0
      ? refreshResult.value.scopes
      : input.currentCredentials.scopes.length > 0
        ? input.currentCredentials.scopes
        : input.grantedScopes;
  const mergedRefreshToken =
    refreshResult.value.refreshToken ?? input.currentCredentials.refreshToken;

  await db.transaction(async (tx) => {
    await tx
      .update(connectedAccounts)
      .set({
        grantedScopes: mergedScopes,
        reconnectReason: null,
        status: "connected",
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, input.connectedAccountId));

    await tx
      .update(accountTokens)
      .set({
        encryptedPayload: encryptCredentialEnvelope(
          serializeProviderCredentialPayload({
            accessToken: refreshResult.value.accessToken,
            expiresAt: expiresAt?.toISOString(),
            refreshToken: mergedRefreshToken,
            scopes: mergedScopes,
            tokenType: refreshResult.value.tokenType,
          }),
          input.encryptionSecret,
        ),
        expiresAt,
        refreshedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accountTokens.connectedAccountId, input.connectedAccountId));
  });

  return {
    accessToken: refreshResult.value.accessToken,
    connectedAccountId: input.connectedAccountId,
    expiresAt: expiresAt?.toISOString(),
    externalAccountId: input.externalAccountId,
    externalAccountLabel: input.externalAccountLabel,
    grantedScopes: mergedScopes,
    provider: input.provider,
    refreshToken: mergedRefreshToken,
    tokenType: refreshResult.value.tokenType,
  };
}
