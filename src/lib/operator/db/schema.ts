import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const teamRole = pgEnum("team_role", ["owner", "staff", "approver"]);
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

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  businessType: varchar("business_type", { length: 160 }).notNull(),
  ownerName: varchar("owner_name", { length: 160 }).notNull(),
  toneGuidance: text("tone_guidance").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  clerkUserId: varchar("clerk_user_id", { length: 120 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  role: teamRole("role").notNull(),
  canApprove: boolean("can_approve").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const toolConnections = pgTable("tool_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sheetMappings = pgTable("sheet_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  spreadsheetId: varchar("spreadsheet_id", { length: 180 }).notNull(),
  worksheetName: varchar("worksheet_name", { length: 160 }).notNull(),
  mapping: jsonb("mapping").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
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
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  status: approvalStatus("status").notNull(),
  channel: deliveryChannel("channel").notNull(),
  rationale: text("rationale").notNull(),
  draftContent: text("draft_content").notNull(),
  approvedByMembershipId: uuid("approved_by_membership_id").references(
    () => memberships.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const deliveryAttempts = pgTable("delivery_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  approvalItemId: uuid("approval_item_id").references(() => approvalItems.id).notNull(),
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
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  actorMembershipId: uuid("actor_membership_id").references(() => memberships.id),
  subjectType: varchar("subject_type", { length: 48 }).notNull(),
  subjectId: varchar("subject_id", { length: 180 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memoryProfiles = pgTable("memory_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
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
