import { loadEnvConfig } from "@next/env";

import {
  activityFeed,
  approvalItems as mockApprovalItems,
  channelMatrix,
  clients as mockClients,
  integrations,
  invoices as mockInvoices,
  onboardingSteps,
  queueMetrics,
  teamMembers,
  workspace,
} from "../src/lib/operator/mock-data";
import { getDb } from "../src/lib/operator/db/client";
import {
  activityLogs,
  approvalItems,
  channelStates,
  clients,
  dashboardMetrics,
  invoices,
  memberships,
  memoryProfiles,
  onboardingCheckpoints,
  organizations,
  toolConnections,
} from "../src/lib/operator/db/schema";

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
      workspaceLabel: workspace.name,
      name: workspace.businessName,
      businessType: workspace.businessType,
      ownerName: workspace.owner,
      toneGuidance: workspace.tone,
      createdAt: organizationCreatedAt,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        workspaceLabel: workspace.name,
        name: workspace.businessName,
        businessType: workspace.businessType,
        ownerName: workspace.owner,
        toneGuidance: workspace.tone,
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

  for (const [index, metric] of queueMetrics.entries()) {
    await db
      .insert(dashboardMetrics)
      .values({
        id: `metric_${index + 1}`,
        organizationId,
        label: metric.label,
        value: metric.value,
        detail: metric.detail,
        trend: metric.trend,
      })
      .onConflictDoUpdate({
        target: dashboardMetrics.id,
        set: {
          label: metric.label,
          value: metric.value,
          detail: metric.detail,
          trend: metric.trend,
        },
      });
  }

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

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
