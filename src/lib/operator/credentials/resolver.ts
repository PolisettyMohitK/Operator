import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  accountTokens,
  connectedAccounts,
} from "@/lib/operator/db/schema";
import {
  decryptCredentialEnvelope,
  parseProviderCredentialPayload,
} from "@/lib/operator/credentials/store";

export type ResolvedConnectedAccountCredentials = Readonly<{
  connectedAccountId: string;
  provider: "gmail" | "google_sheets";
  externalAccountId: string;
  externalAccountLabel: string;
  grantedScopes: string[];
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType: string;
}>;

export async function resolveConnectedAccountCredentials(input: {
  organizationId: string;
  provider: "gmail" | "google_sheets";
  encryptionSecret: string;
}) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select({
      connectedAccountId: connectedAccounts.id,
      provider: connectedAccounts.provider,
      externalAccountId: connectedAccounts.externalAccountId,
      externalAccountLabel: connectedAccounts.externalAccountLabel,
      grantedScopes: connectedAccounts.grantedScopes,
      status: connectedAccounts.status,
      encryptedPayload: accountTokens.encryptedPayload,
    })
    .from(connectedAccounts)
    .innerJoin(
      accountTokens,
      eq(accountTokens.connectedAccountId, connectedAccounts.id),
    )
    .where(
      and(
        eq(connectedAccounts.organizationId, input.organizationId),
        eq(connectedAccounts.provider, input.provider),
      ),
    )
    .limit(1);

  if (
    !row ||
    row.status !== "connected" ||
    !row.encryptedPayload
  ) {
    return null;
  }

  const decryptedPayload = decryptCredentialEnvelope(
    row.encryptedPayload,
    input.encryptionSecret,
  );
  const credentials = parseProviderCredentialPayload(decryptedPayload);

  return {
    connectedAccountId: row.connectedAccountId,
    provider: row.provider,
    externalAccountId: row.externalAccountId,
    externalAccountLabel: row.externalAccountLabel,
    grantedScopes: row.grantedScopes,
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    expiresAt: credentials.expiresAt,
    tokenType: credentials.tokenType,
  } satisfies ResolvedConnectedAccountCredentials;
}
