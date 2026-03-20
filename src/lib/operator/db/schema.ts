import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const teamRole = pgEnum("team_role", ["owner", "staff", "approver"]);
export const workspaceStatus = pgEnum("workspace_status", [
  "draft",
  "active",
  "paused",
]);
export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "edited",
  "approved",
  "rejected",
  "sent",
  "failed",
  "stale",
]);
export const deliveryChannel = pgEnum("delivery_channel", [
  "web",
  "email",
  "whatsapp",
]);
export const approvalRisk = pgEnum("approval_risk", [
  "routine",
  "watch",
  "urgent",
]);
export const connectedAccountProvider = pgEnum("connected_account_provider", [
  "gmail",
  "google_sheets",
]);
export const connectedAccountStatus = pgEnum("connected_account_status", [
  "pending",
  "connected",
  "reconnect_required",
  "disconnected",
  "error",
]);
export const syncRunStatus = pgEnum("sync_run_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "stalled",
]);
export const subscriptionPlan = pgEnum("subscription_plan", [
  "trial",
  "personal",
]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "draft",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    clerkOrganizationId: varchar("clerk_organization_id", { length: 120 }),
    workspaceLabel: varchar("workspace_label", { length: 160 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    businessType: varchar("business_type", { length: 160 }).notNull(),
    ownerName: varchar("owner_name", { length: 160 }).notNull(),
    toneGuidance: text("tone_guidance").notNull(),
    status: workspaceStatus("status").default("draft").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clerkOrganizationIdIdx: uniqueIndex("organizations_clerk_org_id_idx").on(
      table.clerkOrganizationId,
    ),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    clerkUserId: varchar("clerk_user_id", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    role: teamRole("role").notNull(),
    canApprove: boolean("can_approve").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationUserIdx: uniqueIndex("memberships_org_user_idx").on(
      table.organizationId,
      table.clerkUserId,
    ),
    clerkUserIdx: index("memberships_clerk_user_idx").on(table.clerkUserId),
  }),
);

export const clients = pgTable("clients", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  lastTouchpoint: text("last_touchpoint").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  sentiment: text("sentiment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const toolConnections = pgTable("tool_connections", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  detail: text("detail").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    provider: connectedAccountProvider("provider").notNull(),
    externalAccountId: varchar("external_account_id", { length: 180 }).notNull(),
    externalAccountLabel: varchar("external_account_label", { length: 180 }).notNull(),
    status: connectedAccountStatus("status").notNull(),
    grantedScopes: jsonb("granted_scopes").$type<string[]>().notNull().default([]),
    reconnectReason: text("reconnect_reason"),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
    lastSyncState: varchar("last_sync_state", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationProviderIdx: uniqueIndex("connected_accounts_org_provider_idx").on(
      table.organizationId,
      table.provider,
      table.externalAccountId,
    ),
  }),
);

export const accountTokens = pgTable(
  "account_tokens",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    connectedAccountId: varchar("connected_account_id", { length: 120 })
      .references(() => connectedAccounts.id)
      .notNull(),
    encryptedPayload: jsonb("encrypted_payload")
      .$type<{
        algorithm: "aes-256-gcm";
        ciphertext: string;
        iv: string;
        keyVersion: "v1";
        tag: string;
      }>()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    connectedAccountIdx: uniqueIndex("account_tokens_connected_account_idx").on(
      table.connectedAccountId,
    ),
  }),
);

export const sheetMappings = pgTable("sheet_mappings", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  spreadsheetId: varchar("spreadsheet_id", { length: 180 }).notNull(),
  worksheetName: varchar("worksheet_name", { length: 160 }).notNull(),
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const onboardingCheckpoints = pgTable("onboarding_checkpoints", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  position: integer("position").notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const channelStates = pgTable("channel_states", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  channel: deliveryChannel("channel").notNull(),
  state: varchar("state", { length: 64 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  clientId: varchar("client_id", { length: 120 }).references(() => clients.id),
  invoiceId: varchar("invoice_id", { length: 120 }).notNull(),
  clientName: varchar("client_name", { length: 160 }).notNull(),
  clientEmail: varchar("client_email", { length: 180 }),
  clientPhone: varchar("client_phone", { length: 48 }),
  amountDue: numeric("amount_due", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  lastFollowUpAt: timestamp("last_follow_up_at", { withTimezone: true }),
  notes: text("notes"),
  rawSource: jsonb("raw_source").$type<Record<string, unknown>>().notNull().default({}),
});

export const approvalItems = pgTable("approval_items", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  invoiceId: varchar("invoice_id", { length: 120 })
    .references(() => invoices.id)
    .notNull(),
  status: approvalStatus("status").notNull(),
  channel: deliveryChannel("channel").notNull(),
  riskLevel: approvalRisk("risk_level").notNull().default("routine"),
  rationale: text("rationale").notNull(),
  draftContent: text("draft_content").notNull(),
  approvedByMembershipId: varchar("approved_by_membership_id", {
    length: 120,
  }).references(() => memberships.id),
  rejectedByMembershipId: varchar("rejected_by_membership_id", {
    length: 120,
  }).references(() => memberships.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveryAttempts = pgTable("delivery_attempts", {
  id: varchar("id", { length: 120 }).primaryKey(),
  approvalItemId: varchar("approval_item_id", { length: 120 })
    .references(() => approvalItems.id)
    .notNull(),
  channel: deliveryChannel("channel").notNull(),
  state: varchar("state", { length: 48 }).notNull(),
  providerReference: varchar("provider_reference", { length: 180 }),
  responseMetadata: jsonb("response_metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  actorMembershipId: varchar("actor_membership_id", { length: 120 }).references(
    () => memberships.id,
  ),
  subjectType: varchar("subject_type", { length: 48 }).notNull(),
  subjectId: varchar("subject_id", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memoryProfiles = pgTable("memory_profiles", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  communicationTone: text("communication_tone").notNull(),
  reminderPolicy: jsonb("reminder_policy")
    .$type<{
      urgentAfterDays: number;
      staleAfterDays: number;
      minimumSpacingDays: number;
    }>()
    .notNull(),
  clientExceptions: jsonb("client_exceptions")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentPolicies = pgTable(
  "agent_policies",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    desiredPolicyVersion: integer("desired_policy_version").notNull(),
    desiredPolicyHash: varchar("desired_policy_hash", { length: 180 }).notNull(),
    desiredPolicy: jsonb("desired_policy").$type<Record<string, unknown>>().notNull(),
    runtimeStatus: varchar("runtime_status", { length: 64 }).notNull(),
    runtimeSummary: jsonb("runtime_summary")
      .$type<Record<string, unknown> | null>()
      .default(null),
    lastObservedRuntime: jsonb("last_observed_runtime")
      .$type<Record<string, unknown> | null>()
      .default(null),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationPolicyIdx: uniqueIndex("agent_policies_org_idx").on(
      table.organizationId,
    ),
  }),
);

export const policySnapshots = pgTable("policy_snapshots", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  actorMembershipId: varchar("actor_membership_id", { length: 120 }).references(
    () => memberships.id,
  ),
  policyVersion: integer("policy_version").notNull(),
  changeSummary: jsonb("change_summary")
    .$type<
      Array<{
        path: string;
        before: boolean;
        after: boolean;
        effect: string;
        requiresConfirmation: boolean;
        description: string;
      }>
    >()
    .notNull()
    .default([]),
  fullPolicy: jsonb("full_policy").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const syncRuns = pgTable("sync_runs", {
  id: varchar("id", { length: 120 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 120 })
    .references(() => organizations.id)
    .notNull(),
  connectedAccountId: varchar("connected_account_id", { length: 120 }).references(
    () => connectedAccounts.id,
  ),
  kind: varchar("kind", { length: 80 }).notNull(),
  status: syncRunStatus("status").notNull(),
  detail: text("detail").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    plan: subscriptionPlan("plan").notNull(),
    status: subscriptionStatus("status").notNull(),
    providerCustomerId: varchar("provider_customer_id", { length: 180 }),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 180 }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationSubscriptionIdx: uniqueIndex("subscriptions_org_idx").on(
      table.organizationId,
    ),
  }),
);

export const featureGates = pgTable(
  "feature_gates",
  {
    id: varchar("id", { length: 120 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 120 })
      .references(() => organizations.id)
      .notNull(),
    key: varchar("key", { length: 120 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationFeatureGateIdx: uniqueIndex("feature_gates_org_key_idx").on(
      table.organizationId,
      table.key,
    ),
  }),
);
