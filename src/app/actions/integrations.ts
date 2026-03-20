"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";

import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getDb } from "@/lib/operator/db/client";
import {
  accountTokens,
  activityLogs,
  connectedAccounts,
} from "@/lib/operator/db/schema";
import type { GoogleOAuthProvider } from "@/lib/operator/oauth/google-scopes";

function buildRecordId(prefix: string, seed: string) {
  return `${prefix}_${seed}_${crypto.randomUUID()}`.slice(0, 120);
}

function getProviderLabel(provider: GoogleOAuthProvider) {
  return provider === "gmail" ? "Gmail" : "Google Sheets";
}

export async function disconnectConnectedAccount(provider: GoogleOAuthProvider) {
  const viewerContext = await requireViewerContext();

  if (viewerContext.role !== "owner") {
    throw new Error("Only workspace owners can manage Google connections.");
  }

  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: connectedAccounts.id,
        externalAccountLabel: connectedAccounts.externalAccountLabel,
      })
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.organizationId, viewerContext.organizationId),
          eq(connectedAccounts.provider, provider),
        ),
      )
      .orderBy(desc(connectedAccounts.updatedAt))
      .limit(1);

    if (!account) {
      throw new Error(`No ${getProviderLabel(provider)} account is stored yet.`);
    }

    await tx
      .update(connectedAccounts)
      .set({
        reconnectReason: `${getProviderLabel(provider)} was Disconnected by the workspace owner.`,
        status: "disconnected",
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, account.id));

    await tx
      .delete(accountTokens)
      .where(eq(accountTokens.connectedAccountId, account.id));

    await tx.insert(activityLogs).values({
      id: buildRecordId("activity", `${viewerContext.organizationId}_${provider}`),
      organizationId: viewerContext.organizationId,
      actorMembershipId: viewerContext.membershipId,
      subjectType: "connected_account",
      subjectId: account.id,
      title: `${getProviderLabel(provider)} disconnected`,
      message: `${getProviderLabel(provider)} was disconnected for ${viewerContext.businessName}.`,
      metadata: {
        channel: "Web",
        externalAccountLabel: account.externalAccountLabel,
        provider,
        trigger: "owner_disconnect",
      },
    });
  });

  revalidatePath("/app/integrations");
  revalidatePath("/app/onboarding");
  revalidatePath("/ops");
}
