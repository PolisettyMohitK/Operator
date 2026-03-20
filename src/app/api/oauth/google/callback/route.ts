import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";

import { getViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getDb } from "@/lib/operator/db/client";
import {
  accountTokens,
  activityLogs,
  connectedAccounts,
  syncRuns,
} from "@/lib/operator/db/schema";
import {
  decryptCredentialEnvelope,
  encryptCredentialEnvelope,
  parseProviderCredentialPayload,
  serializeProviderCredentialPayload,
} from "@/lib/operator/credentials/store";
import { getCredentialEncryptionSecret } from "@/lib/operator/integrations/env";
import {
  buildConnectedGoogleAccountId,
  buildConnectedGoogleTokenId,
  clearGoogleOAuthStateCookie,
  exchangeGoogleAuthorizationCode,
  fetchGoogleAccountIdentity,
  getRequiredGoogleOAuthConfig,
  parseGoogleOAuthStateCookie,
  readGoogleOAuthStateCookie,
  sanitizeOAuthReturnTo,
} from "@/lib/operator/oauth/google";

function buildRecordId(prefix: string, seed: string) {
  return `${prefix}_${seed}_${crypto.randomUUID()}`.slice(0, 120);
}

function redirectToReturnTo(
  request: Request,
  returnTo: string,
  oauth: string,
  clearCookie = true,
) {
  const target = new URL(sanitizeOAuthReturnTo(returnTo), request.url);
  target.searchParams.set("oauth", oauth);
  const response = NextResponse.redirect(target, { status: 302 });

  if (clearCookie) {
    response.headers.append("Set-Cookie", clearGoogleOAuthStateCookie());
  }

  return response;
}

function getSyncDetail(provider: "gmail" | "google_sheets") {
  return provider === "google_sheets"
    ? "Initial invoice sync requested after Google Sheets was connected."
    : "Gmail connection refreshed and ready for outbound delivery.";
}

export async function GET(request: Request) {
  const viewerContext = await getViewerContext();

  if (!viewerContext || viewerContext.role !== "owner") {
    return redirectToReturnTo(request, "/app/integrations", "owner_required");
  }

  const url = new URL(request.url);
  const stateNonce = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieValue = readGoogleOAuthStateCookie(request);
  const state = parseGoogleOAuthStateCookie(cookieValue, process.env);

  if (
    !stateNonce ||
    !code ||
    !state ||
    state.nonce !== stateNonce ||
    state.organizationId !== viewerContext.organizationId ||
    state.membershipId !== viewerContext.membershipId
  ) {
    return new Response("Invalid Google OAuth state.", { status: 400 });
  }

  const db = getDb();

  if (!db) {
    return new Response("DATABASE_URL is not configured.", { status: 500 });
  }

  try {
    const tokenResponse = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: state.codeVerifier,
      config: getRequiredGoogleOAuthConfig(process.env),
    });

    if (!tokenResponse.ok) {
      return redirectToReturnTo(
        request,
        state.returnTo,
        tokenResponse.error.code === "invalid_grant"
          ? "connect_failed"
          : "exchange_failed",
      );
    }

    const identity = await fetchGoogleAccountIdentity({
      accessToken: tokenResponse.value.accessToken,
    });
    const connectedAccountId = buildConnectedGoogleAccountId({
      externalAccountId: identity.externalAccountId,
      organizationId: viewerContext.organizationId,
      provider: state.provider,
    });
    const tokenId = buildConnectedGoogleTokenId(connectedAccountId);
    const encryptionSecret = getCredentialEncryptionSecret(process.env);

    await db.transaction(async (tx) => {
      const [existingTokenRow] = await tx
        .select({
          encryptedPayload: accountTokens.encryptedPayload,
        })
        .from(connectedAccounts)
        .leftJoin(
          accountTokens,
          eq(accountTokens.connectedAccountId, connectedAccounts.id),
        )
        .where(
          eq(connectedAccounts.id, connectedAccountId),
        )
        .limit(1);

      const existingPayload =
        existingTokenRow?.encryptedPayload
          ? parseProviderCredentialPayload(
              decryptCredentialEnvelope(
                existingTokenRow.encryptedPayload,
                encryptionSecret,
              ),
            )
          : null;
      const refreshToken =
        tokenResponse.value.refreshToken ??
        existingPayload?.refreshToken;
      const expiresAt = tokenResponse.value.expiresIn
        ? new Date(Date.now() + tokenResponse.value.expiresIn * 1000)
        : null;

      await tx
        .insert(connectedAccounts)
        .values({
          id: connectedAccountId,
          organizationId: viewerContext.organizationId,
          provider: state.provider,
          externalAccountId: identity.externalAccountId,
          externalAccountLabel: identity.externalAccountLabel,
          status: "connected",
          grantedScopes: tokenResponse.value.scopes,
          reconnectReason: null,
          lastSuccessfulSyncAt: state.provider === "google_sheets" ? null : new Date(),
          lastSyncState: state.provider === "google_sheets" ? "pending" : "connected",
          metadata: {
            connectedVia: "google_oauth",
          },
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            connectedAccounts.organizationId,
            connectedAccounts.provider,
            connectedAccounts.externalAccountId,
          ],
          set: {
            externalAccountLabel: identity.externalAccountLabel,
            grantedScopes: tokenResponse.value.scopes,
            reconnectReason: null,
            status: "connected",
            updatedAt: new Date(),
          },
        });

      await tx
        .update(connectedAccounts)
        .set({
          reconnectReason:
            "Another Google account was connected for this provider.",
          status: "disconnected",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(connectedAccounts.organizationId, viewerContext.organizationId),
            eq(connectedAccounts.provider, state.provider),
            ne(connectedAccounts.id, connectedAccountId),
          ),
        );

      await tx
        .insert(accountTokens)
        .values({
          id: tokenId,
          organizationId: viewerContext.organizationId,
          connectedAccountId,
          encryptedPayload: encryptCredentialEnvelope(
            serializeProviderCredentialPayload({
              accessToken: tokenResponse.value.accessToken,
              expiresAt: expiresAt?.toISOString(),
              refreshToken,
              scopes: tokenResponse.value.scopes,
              tokenType: tokenResponse.value.tokenType,
            }),
            encryptionSecret,
          ),
          expiresAt,
          refreshedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: accountTokens.connectedAccountId,
          set: {
            encryptedPayload: encryptCredentialEnvelope(
              serializeProviderCredentialPayload({
                accessToken: tokenResponse.value.accessToken,
                expiresAt: expiresAt?.toISOString(),
                refreshToken,
                scopes: tokenResponse.value.scopes,
                tokenType: tokenResponse.value.tokenType,
              }),
              encryptionSecret,
            ),
            expiresAt,
            refreshedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      await tx.insert(activityLogs).values({
        id: buildRecordId("activity", `${viewerContext.organizationId}_${state.provider}`),
        organizationId: viewerContext.organizationId,
        actorMembershipId: viewerContext.membershipId,
        subjectType: "connected_account",
        subjectId: connectedAccountId,
        title: `${state.provider === "gmail" ? "Gmail" : "Google Sheets"} connected`,
        message: `${state.provider === "gmail" ? "Gmail" : "Google Sheets"} was connected as ${identity.externalAccountLabel}.`,
        metadata: {
          channel: "Web",
          provider: state.provider,
          trigger: "google_oauth_callback",
        },
      });

      if (state.provider === "google_sheets") {
        await tx.insert(syncRuns).values({
          id: buildRecordId("sync", `${viewerContext.organizationId}_${state.provider}`),
          organizationId: viewerContext.organizationId,
          connectedAccountId,
          kind: "invoice_sync",
          status: "pending",
          detail: getSyncDetail(state.provider),
          retryCount: 0,
          metadata: {
            trigger: "google_oauth_connect",
          },
        });
      }
    });

    if (state.provider === "google_sheets") {
      const { processQueuedInvoiceSyncRuns } = await import(
        "@/lib/operator/sync/invoice-worker"
      );
      await processQueuedInvoiceSyncRuns({
        organizationId: viewerContext.organizationId,
      });
    }

    return redirectToReturnTo(request, state.returnTo, "connected");
  } catch {
    return redirectToReturnTo(request, state.returnTo, "connect_failed");
  }
}
