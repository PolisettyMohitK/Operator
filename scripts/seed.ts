import { loadEnvConfig } from "@next/env";

import {
  activityFeed,
  approvalItems as mockApprovalItems,
  channelMatrix,
  clients as mockClients,
  invoices as mockInvoices,
  integrations,
  onboardingSteps,
  teamMembers,
  workspace,
} from "../src/lib/operator/mock-data";
import {
  encryptCredentialEnvelope,
  serializeProviderCredentialPayload,
} from "../src/lib/operator/credentials/store";
import { getDb } from "../src/lib/operator/db/client";
import {
  activityLogs,
  accountTokens,
  agentPolicies,
  approvalItems,
  channelStates,
  clients,
  connectedAccounts,
  featureGates,
  invoices,
  memberships,
  memoryProfiles,
  onboardingCheckpoints,
  organizations,
  policySnapshots,
  sheetMappings,
  subscriptions,
  syncRuns,
  toolConnections,
} from "../src/lib/operator/db/schema";
import { getCredentialEncryptionSecret } from "../src/lib/operator/integrations/env";
import { createDefaultAgentPolicy } from "../src/lib/operator/policy/defaults";

loadEnvConfig(process.cwd());

function requireDb() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required before seeding.");
  }

  return db;
}

const organizationId = "org_northline_advisory";
const organizationCreatedAt = new Date("2026-03-19T06:00:00Z");
const encryptionSecret = getCredentialEncryptionSecret(process.env);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCurrency(value: string) {
  return Number(value.replace(/[^0-9.-]/g, ""));
}

function parseShortDate(value: string) {
  if (value === "—") {
    return null;
  }

  return new Date(`2026 ${value} 00:00:00 UTC`);
}

function parseTimeLabel(value: string) {
  return new Date(`2026-03-19T${value}:00Z`);
}

async function seed() {
  const db = requireDb();

  await db
    .insert(organizations)
    .values({
      id: organizationId,
      clerkOrganizationId: null,
      workspaceLabel: workspace.name,
      name: workspace.businessName,
      businessType: workspace.businessType,
      ownerName: workspace.owner,
      toneGuidance: workspace.tone,
      status: "active",
      activatedAt: organizationCreatedAt,
      createdAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        clerkOrganizationId: null,
        workspaceLabel: workspace.name,
        name: workspace.businessName,
        businessType: workspace.businessType,
        ownerName: workspace.owner,
        toneGuidance: workspace.tone,
        status: "active",
        activatedAt: organizationCreatedAt,
      },
    });

  await db
    .insert(memoryProfiles)
    .values({
      id: `memory_${organizationId}`,
      organizationId,
      communicationTone: workspace.tone,
      reminderPolicy: {
        urgentAfterDays: 14,
        staleAfterDays: 30,
        minimumSpacingDays: 3,
      },
      clientExceptions: {},
      updatedAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: memoryProfiles.id,
      set: {
        communicationTone: workspace.tone,
        reminderPolicy: {
          urgentAfterDays: 14,
          staleAfterDays: 30,
          minimumSpacingDays: 3,
        },
      },
    });

  for (const [index, step] of onboardingSteps.entries()) {
    await db
      .insert(onboardingCheckpoints)
      .values({
        id: `onboarding_${index + 1}`,
        organizationId,
        position: index + 1,
        label: step,
      })
      .onConflictDoUpdate({
        target: onboardingCheckpoints.id,
        set: {
          position: index + 1,
          label: step,
        },
      });
  }

  await db
    .insert(sheetMappings)
    .values({
      id: `mapping_${organizationId}`,
      organizationId,
      spreadsheetId: "sheet_northline_ops",
      worksheetName: "Invoices",
      mapping: {
        invoiceId: "Invoice Number",
        clientName: "Client Name",
        clientEmail: "Email",
        clientPhone: "Phone",
        amountDue: "Outstanding",
        dueDate: "Due Date",
        status: "State",
        notes: "Notes",
      },
    })
    .onConflictDoUpdate({
      target: sheetMappings.id,
      set: {
        spreadsheetId: "sheet_northline_ops",
        worksheetName: "Invoices",
        mapping: {
          invoiceId: "Invoice Number",
          clientName: "Client Name",
          clientEmail: "Email",
          clientPhone: "Phone",
          amountDue: "Outstanding",
          dueDate: "Due Date",
          status: "State",
          notes: "Notes",
        },
      },
    });

  for (const channelState of channelMatrix) {
    await db
      .insert(channelStates)
      .values({
        id: `channel_${channelState.channel}`,
        organizationId,
        channel: channelState.channel,
        state: channelState.state,
        note: channelState.note,
      })
      .onConflictDoUpdate({
        target: channelStates.id,
        set: {
          state: channelState.state,
          note: channelState.note,
        },
      });
  }

  for (const member of teamMembers) {
    await db
      .insert(memberships)
      .values({
        id: member.id,
        organizationId,
        clerkUserId: `seed_${member.id}`,
        displayName: member.name,
        role: member.role,
        canApprove: member.role === "owner" || member.role === "approver",
      })
      .onConflictDoUpdate({
        target: memberships.id,
        set: {
          clerkUserId: `seed_${member.id}`,
          displayName: member.name,
          role: member.role,
          canApprove: member.role === "owner" || member.role === "approver",
        },
      });
  }

  const clientIdByName = new Map<string, string>();

  for (const client of mockClients) {
    const clientId = `client_${slugify(client.name)}`;
    clientIdByName.set(client.name, clientId);

    await db
      .insert(clients)
      .values({
        id: clientId,
        organizationId,
        name: client.name,
        contactName: client.contact,
        lastTouchpoint: client.lastTouchpoint,
        balance: String(parseCurrency(client.balance)),
        sentiment: client.sentiment,
      })
      .onConflictDoUpdate({
        target: clients.id,
        set: {
          name: client.name,
          contactName: client.contact,
          lastTouchpoint: client.lastTouchpoint,
          balance: String(parseCurrency(client.balance)),
          sentiment: client.sentiment,
        },
      });
  }

  for (const invoice of mockInvoices) {
    await db
      .insert(invoices)
      .values({
        id: invoice.invoiceId,
        organizationId,
        clientId: clientIdByName.get(invoice.clientName) ?? null,
        invoiceId: invoice.invoiceId,
        clientName: invoice.clientName,
        amountDue: String(invoice.amountDue),
        dueDate: new Date(`${invoice.dueDate}T00:00:00Z`),
        status: invoice.status.toLowerCase().replace(/\s+/g, "_"),
        lastFollowUpAt: parseShortDate(invoice.lastFollowUpAt),
        notes: `Primary channel: ${invoice.channel}. Owner: ${invoice.owner}.`,
        rawSource: invoice,
      })
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          clientId: clientIdByName.get(invoice.clientName) ?? null,
          clientName: invoice.clientName,
          amountDue: String(invoice.amountDue),
          dueDate: new Date(`${invoice.dueDate}T00:00:00Z`),
          status: invoice.status.toLowerCase().replace(/\s+/g, "_"),
          lastFollowUpAt: parseShortDate(invoice.lastFollowUpAt),
          notes: `Primary channel: ${invoice.channel}. Owner: ${invoice.owner}.`,
          rawSource: invoice,
        },
      });
  }

  for (const item of mockApprovalItems) {
    await db
      .insert(approvalItems)
      .values({
        id: item.id,
        organizationId,
        invoiceId: item.invoiceId,
        status: item.status,
        channel: item.channel,
        riskLevel: item.risk,
        rationale: item.reason,
        draftContent: item.preview,
        approvedByMembershipId:
          item.status === "approved" ? "approver_1" : null,
        rejectedByMembershipId:
          item.status === "rejected" ? "owner_1" : null,
      })
      .onConflictDoUpdate({
        target: approvalItems.id,
        set: {
          status: item.status,
          channel: item.channel,
          riskLevel: item.risk,
          rationale: item.reason,
          draftContent: item.preview,
          approvedByMembershipId:
            item.status === "approved" ? "approver_1" : null,
          rejectedByMembershipId:
            item.status === "rejected" ? "owner_1" : null,
        },
      });
  }

  for (const integration of integrations) {
    await db
      .insert(toolConnections)
      .values({
        id: `tool_${slugify(integration.name)}`,
        organizationId,
        provider: integration.name,
        status: integration.status,
        detail: integration.detail,
        metadata: {
          seeded: true,
        },
      })
      .onConflictDoUpdate({
        target: toolConnections.id,
        set: {
          provider: integration.name,
          status: integration.status,
          detail: integration.detail,
          metadata: {
            seeded: true,
          },
        },
      });
  }

  const connectedAccountFixtures = [
    {
      id: "connected_gmail_org_northline",
      provider: "gmail" as const,
      externalAccountId: "google-owner-account",
      externalAccountLabel: "hello@northlineadvisory.com",
      scopes: ["gmail.send"],
    },
    {
      id: "connected_sheets_org_northline",
      provider: "google_sheets" as const,
      externalAccountId: "google-owner-account",
      externalAccountLabel: "hello@northlineadvisory.com",
      scopes: ["spreadsheets.readonly"],
    },
  ];

  for (const account of connectedAccountFixtures) {
    await db
      .insert(connectedAccounts)
      .values({
        id: account.id,
        organizationId,
        provider: account.provider,
        externalAccountId: account.externalAccountId,
        externalAccountLabel: account.externalAccountLabel,
        status: "connected",
        grantedScopes: account.scopes,
        reconnectReason: null,
        lastSuccessfulSyncAt: organizationCreatedAt,
        lastSyncState: "succeeded",
        metadata: {
          seeded: true,
        },
        createdAt: organizationCreatedAt,
        updatedAt: organizationCreatedAt,
      })
      .onConflictDoUpdate({
        target: connectedAccounts.id,
        set: {
          externalAccountLabel: account.externalAccountLabel,
          status: "connected",
          grantedScopes: account.scopes,
          reconnectReason: null,
          lastSuccessfulSyncAt: organizationCreatedAt,
          lastSyncState: "succeeded",
          metadata: {
            seeded: true,
          },
          updatedAt: organizationCreatedAt,
        },
      });

    await db
      .insert(accountTokens)
      .values({
        id: `token_${account.id}`,
        organizationId,
        connectedAccountId: account.id,
        encryptedPayload: encryptCredentialEnvelope(
          serializeProviderCredentialPayload({
            accessToken: `${account.provider}_seed_access_token`,
            refreshToken: `${account.provider}_seed_refresh_token`,
            scopes: account.scopes,
            tokenType: "Bearer",
          }),
          encryptionSecret,
        ),
        expiresAt: new Date("2026-04-19T06:00:00Z"),
        refreshedAt: organizationCreatedAt,
        createdAt: organizationCreatedAt,
        updatedAt: organizationCreatedAt,
      })
      .onConflictDoUpdate({
        target: accountTokens.id,
        set: {
          encryptedPayload: encryptCredentialEnvelope(
            serializeProviderCredentialPayload({
              accessToken: `${account.provider}_seed_access_token`,
              refreshToken: `${account.provider}_seed_refresh_token`,
              scopes: account.scopes,
              tokenType: "Bearer",
            }),
            encryptionSecret,
          ),
          expiresAt: new Date("2026-04-19T06:00:00Z"),
          refreshedAt: organizationCreatedAt,
          updatedAt: organizationCreatedAt,
        },
      });
  }

  const defaultAgentPolicy = createDefaultAgentPolicy({
    toneGuidance: workspace.tone,
    workspaceLabel: workspace.businessName,
  });

  await db
    .insert(agentPolicies)
    .values({
      id: `policy_${organizationId}`,
      organizationId,
      desiredPolicyVersion: 1,
      desiredPolicyHash: "seed_policy_v1",
      desiredPolicy: defaultAgentPolicy,
      runtimeStatus: "healthy",
      runtimeSummary: {
        deliveryChannels: {
          email: true,
          web: true,
        },
        executionPolicy: "require-approval",
        toolPermissions: {
          gmailSend: true,
          googleSheetsRead: true,
        },
        workspaceLabel: workspace.businessName,
      },
      lastObservedRuntime: {
        deliveryChannels: {
          email: true,
          web: true,
        },
        executionPolicy: "require-approval",
        toolPermissions: {
          gmailSend: true,
          googleSheetsRead: true,
        },
        workspaceLabel: workspace.businessName,
      },
      lastObservedAt: organizationCreatedAt,
      lastSyncedAt: organizationCreatedAt,
      lastError: null,
      createdAt: organizationCreatedAt,
      updatedAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: agentPolicies.id,
      set: {
        desiredPolicyVersion: 1,
        desiredPolicyHash: "seed_policy_v1",
        desiredPolicy: defaultAgentPolicy,
        runtimeStatus: "healthy",
        runtimeSummary: {
          deliveryChannels: {
            email: true,
            web: true,
          },
          executionPolicy: "require-approval",
          toolPermissions: {
            gmailSend: true,
            googleSheetsRead: true,
          },
          workspaceLabel: workspace.businessName,
        },
        lastObservedRuntime: {
          deliveryChannels: {
            email: true,
            web: true,
          },
          executionPolicy: "require-approval",
          toolPermissions: {
            gmailSend: true,
            googleSheetsRead: true,
          },
          workspaceLabel: workspace.businessName,
        },
        lastObservedAt: organizationCreatedAt,
        lastSyncedAt: organizationCreatedAt,
        lastError: null,
        updatedAt: organizationCreatedAt,
      },
    });

  await db
    .insert(policySnapshots)
    .values({
      id: `policy_snapshot_${organizationId}`,
      organizationId,
      actorMembershipId: "owner_1",
      policyVersion: 1,
      changeSummary: [],
      fullPolicy: defaultAgentPolicy,
      createdAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: policySnapshots.id,
      set: {
        actorMembershipId: "owner_1",
        policyVersion: 1,
        changeSummary: [],
        fullPolicy: defaultAgentPolicy,
        createdAt: organizationCreatedAt,
      },
    });

  await db
    .insert(subscriptions)
    .values({
      id: `subscription_${organizationId}`,
      organizationId,
      plan: "trial",
      status: "trialing",
      providerCustomerId: "cus_seed_northline",
      providerSubscriptionId: null,
      trialEndsAt: new Date("2026-04-02T06:00:00Z"),
      currentPeriodEndsAt: new Date("2026-04-02T06:00:00Z"),
      createdAt: organizationCreatedAt,
      updatedAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        plan: "trial",
        status: "trialing",
        providerCustomerId: "cus_seed_northline",
        providerSubscriptionId: null,
        trialEndsAt: new Date("2026-04-02T06:00:00Z"),
        currentPeriodEndsAt: new Date("2026-04-02T06:00:00Z"),
        updatedAt: organizationCreatedAt,
      },
    });

  for (const gate of [
    {
      id: `feature_gate_${organizationId}_invoice_recovery`,
      key: "invoice_recovery",
      enabled: true,
      reason: "Paid V1 default workflow",
    },
    {
      id: `feature_gate_${organizationId}_advanced_runtime`,
      key: "advanced_runtime",
      enabled: false,
      reason: "Roadmap flagged for post-launch",
    },
  ]) {
    await db
      .insert(featureGates)
      .values({
        id: gate.id,
        organizationId,
        key: gate.key,
        enabled: gate.enabled,
        reason: gate.reason,
        createdAt: organizationCreatedAt,
        updatedAt: organizationCreatedAt,
      })
      .onConflictDoUpdate({
        target: featureGates.id,
        set: {
          enabled: gate.enabled,
          reason: gate.reason,
          updatedAt: organizationCreatedAt,
        },
      });
  }

  for (const [index, event] of activityFeed.entries()) {
    await db
      .insert(activityLogs)
      .values({
        id: `activity_${index + 1}`,
        organizationId,
        actorMembershipId: null,
        subjectType: "activity",
        subjectId: `activity_${index + 1}`,
        title: event.title,
        message: event.detail,
        metadata: {
          channel: event.channel,
          timeLabel: event.timestamp,
        },
        createdAt: parseTimeLabel(event.timestamp),
      })
      .onConflictDoUpdate({
        target: activityLogs.id,
        set: {
          title: event.title,
          message: event.detail,
          metadata: {
            channel: event.channel,
            timeLabel: event.timestamp,
          },
          createdAt: parseTimeLabel(event.timestamp),
        },
      });
  }

  for (const syncRun of [
    {
      id: `sync_${organizationId}_invoice`,
      connectedAccountId: "connected_sheets_org_northline",
      kind: "invoice_sync",
      status: "succeeded" as const,
      detail: "Invoice sync completed successfully.",
    },
    {
      id: `sync_${organizationId}_policy`,
      connectedAccountId: null,
      kind: "policy_reconcile",
      status: "succeeded" as const,
      detail: "OpenClaw policy reconcile completed successfully.",
    },
  ]) {
    await db
      .insert(syncRuns)
      .values({
        id: syncRun.id,
        organizationId,
        connectedAccountId: syncRun.connectedAccountId,
        kind: syncRun.kind,
        status: syncRun.status,
        detail: syncRun.detail,
        retryCount: 0,
        metadata: {
          seeded: true,
        },
        startedAt: organizationCreatedAt,
        finishedAt: organizationCreatedAt,
      })
      .onConflictDoUpdate({
        target: syncRuns.id,
        set: {
          status: syncRun.status,
          detail: syncRun.detail,
          retryCount: 0,
          metadata: {
            seeded: true,
          },
          startedAt: organizationCreatedAt,
          finishedAt: organizationCreatedAt,
        },
      });
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
