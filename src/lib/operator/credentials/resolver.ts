import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  accountTokens,
  connectedAccounts,
} from "@/lib/operator/db/schema";
import { refreshGoogleConnectedAccountCredentials } from "@/lib/operator/credentials/google-refresh";
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

function isCredentialExpired(expiresAt: string | Date | null | undefined) {
  if (!expiresAt) {
    return false;
  }

  const parsed =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() <= Date.now() + 60_000;
}

export async function resolveConnectedAccountCredentials(input: {
  organizationId: string;
  provider: "gmail" | "google_sheets";
  encryptionSecret: string;
  env?: Readonly<Record<string, string | undefined>>;
  fetchImpl?: typeof fetch;
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
      expiresAt: accountTokens.expiresAt,
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
    .orderBy(desc(connectedAccounts.updatedAt))
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

  if (isCredentialExpired(credentials.expiresAt ?? row.expiresAt)) {
    return refreshGoogleConnectedAccountCredentials({
      connectedAccountId: row.connectedAccountId,
      currentCredentials: {
        accessToken: credentials.accessToken,
        expiresAt: credentials.expiresAt ?? row.expiresAt?.toISOString(),
        refreshToken: credentials.refreshToken,
        scopes: credentials.scopes,
        tokenType: credentials.tokenType,
      },
      encryptionSecret: input.encryptionSecret,
      env: input.env,
      externalAccountId: row.externalAccountId,
      externalAccountLabel: row.externalAccountLabel,
      fetchImpl: input.fetchImpl,
      grantedScopes: row.grantedScopes,
      organizationId: input.organizationId,
      provider: row.provider,
    });
  }

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
