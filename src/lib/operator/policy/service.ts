import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/operator/db/client";
import {
  agentPolicies,
  policySnapshots,
  syncRuns,
} from "@/lib/operator/db/schema";
import { summarizePolicyChanges } from "@/lib/operator/policy/diff";
import type { WorkspaceAgentPolicy } from "@/lib/operator/policy/schema";
import { reconcileRuntimeState, type RuntimeClient } from "@/lib/operator/runtime/runtime-manager";

function buildRecordId(prefix: string, value: string) {
  return `${prefix}_${value}_${crypto.randomUUID()}`.slice(0, 120);
}

function createPolicyHash(policy: WorkspaceAgentPolicy) {
  return createHash("sha256")
    .update(JSON.stringify(policy), "utf8")
    .digest("hex");
}

export async function persistWorkspaceAgentPolicy(input: {
  actorMembershipId: string;
  organizationId: string;
  policy: WorkspaceAgentPolicy;
  runtimeClient: RuntimeClient;
  tx?: {
    select: NonNullable<ReturnType<typeof getDb>>["select"];
    update: NonNullable<ReturnType<typeof getDb>>["update"];
    insert: NonNullable<ReturnType<typeof getDb>>["insert"];
  };
}) {
  const db = getDb();

  if (!db && !input.tx) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const persistWithTransaction = async (tx: NonNullable<typeof input.tx>) => {
    const [existingPolicy] = await tx
      .select({
        id: agentPolicies.id,
        desiredPolicyVersion: agentPolicies.desiredPolicyVersion,
        desiredPolicy: agentPolicies.desiredPolicy,
      })
      .from(agentPolicies)
      .where(eq(agentPolicies.organizationId, input.organizationId))
      .limit(1);

    const nextVersion = (existingPolicy?.desiredPolicyVersion ?? 0) + 1;
    const runtimeResult = await reconcileRuntimeState({
      client: input.runtimeClient,
      policy: input.policy,
    });
    const syncStatus =
      runtimeResult.runtimeStatus === "healthy" ? "succeeded" : "failed";
    const desiredPolicyHash = createPolicyHash(input.policy);
    const changeSummary = existingPolicy
      ? summarizePolicyChanges(
          existingPolicy.desiredPolicy as WorkspaceAgentPolicy,
          input.policy,
        )
      : [];

    if (existingPolicy) {
      await tx
        .update(agentPolicies)
        .set({
          desiredPolicyVersion: nextVersion,
          desiredPolicyHash,
          desiredPolicy: input.policy,
          runtimeStatus: runtimeResult.runtimeStatus,
          runtimeSummary: runtimeResult.runtimeSummary,
          lastObservedRuntime: runtimeResult.observedRuntime,
          lastObservedAt: new Date(),
          lastSyncedAt: new Date(),
          lastError: runtimeResult.lastError,
          updatedAt: new Date(),
        })
        .where(eq(agentPolicies.id, existingPolicy.id));
    } else {
      await tx.insert(agentPolicies).values({
        id: buildRecordId("policy", input.organizationId),
        organizationId: input.organizationId,
        desiredPolicyVersion: nextVersion,
        desiredPolicyHash,
        desiredPolicy: input.policy,
        runtimeStatus: runtimeResult.runtimeStatus,
        runtimeSummary: runtimeResult.runtimeSummary,
        lastObservedRuntime: runtimeResult.observedRuntime,
        lastObservedAt: new Date(),
        lastSyncedAt: new Date(),
        lastError: runtimeResult.lastError,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await tx.insert(policySnapshots).values({
      id: buildRecordId("policy_snapshot", input.organizationId),
      organizationId: input.organizationId,
      actorMembershipId: input.actorMembershipId,
      policyVersion: nextVersion,
      changeSummary,
      fullPolicy: input.policy,
      createdAt: new Date(),
    });

    await tx.insert(syncRuns).values({
      id: buildRecordId("sync", `${input.organizationId}_policy_reconcile`),
      organizationId: input.organizationId,
      connectedAccountId: null,
      kind: "policy_reconcile",
      status: syncStatus,
      detail:
        runtimeResult.runtimeStatus === "healthy"
          ? "OpenClaw policy reconcile completed successfully."
          : runtimeResult.lastError ??
            "OpenClaw policy reconcile entered a degraded state.",
      retryCount: 0,
      metadata: {
        runtimeStatus: runtimeResult.runtimeStatus,
        desiredPolicyVersion: nextVersion,
      },
      startedAt: new Date(),
      finishedAt: new Date(),
    });

    return {
      policyVersion: nextVersion,
      runtimeStatus: runtimeResult.runtimeStatus,
    };
  };

  if (input.tx) {
    return persistWithTransaction(input.tx);
  }

  return db!.transaction(async (tx) => persistWithTransaction(tx));
}
