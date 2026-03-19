CREATE TYPE "public"."approval_risk" AS ENUM('routine', 'watch', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'edited', 'approved', 'rejected', 'sent', 'failed', 'stale');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('web', 'email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'staff', 'approver');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"actor_membership_id" varchar(120),
	"subject_type" varchar(48) NOT NULL,
	"subject_id" varchar(180) NOT NULL,
	"title" varchar(180) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_items" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"invoice_id" varchar(120) NOT NULL,
	"status" "approval_status" NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"risk_level" "approval_risk" DEFAULT 'routine' NOT NULL,
	"rationale" text NOT NULL,
	"draft_content" text NOT NULL,
	"approved_by_membership_id" varchar(120),
	"rejected_by_membership_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_states" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"state" varchar(64) NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"last_touchpoint" text NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"sentiment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_metrics" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"label" varchar(120) NOT NULL,
	"value" varchar(120) NOT NULL,
	"detail" text NOT NULL,
	"trend" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_attempts" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"approval_item_id" varchar(120) NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"state" varchar(48) NOT NULL,
	"provider_reference" varchar(180),
	"response_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"client_id" varchar(120),
	"invoice_id" varchar(120) NOT NULL,
	"client_name" varchar(160) NOT NULL,
	"client_email" varchar(180),
	"client_phone" varchar(48),
	"amount_due" numeric(12, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" varchar(64) NOT NULL,
	"last_follow_up_at" timestamp with time zone,
	"notes" text,
	"raw_source" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"clerk_user_id" varchar(120) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"role" "team_role" NOT NULL,
	"can_approve" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_profiles" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"communication_tone" text NOT NULL,
	"reminder_policy" jsonb NOT NULL,
	"client_exceptions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_checkpoints" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"position" integer NOT NULL,
	"label" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"workspace_label" varchar(160) NOT NULL,
	"name" varchar(160) NOT NULL,
	"business_type" varchar(160) NOT NULL,
	"owner_name" varchar(160) NOT NULL,
	"tone_guidance" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_mappings" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"spreadsheet_id" varchar(180) NOT NULL,
	"worksheet_name" varchar(160) NOT NULL,
	"mapping" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_connections" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"status" varchar(64) NOT NULL,
	"detail" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_membership_id_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_approved_by_membership_id_memberships_id_fk" FOREIGN KEY ("approved_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_rejected_by_membership_id_memberships_id_fk" FOREIGN KEY ("rejected_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_states" ADD CONSTRAINT "channel_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_approval_item_id_approval_items_id_fk" FOREIGN KEY ("approval_item_id") REFERENCES "public"."approval_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_profiles" ADD CONSTRAINT "memory_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_checkpoints" ADD CONSTRAINT "onboarding_checkpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_mappings" ADD CONSTRAINT "sheet_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_connections" ADD CONSTRAINT "tool_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;