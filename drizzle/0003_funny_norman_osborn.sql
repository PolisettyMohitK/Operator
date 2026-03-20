CREATE TYPE "public"."connected_account_provider" AS ENUM('gmail', 'google_sheets');--> statement-breakpoint
CREATE TYPE "public"."connected_account_status" AS ENUM('pending', 'connected', 'reconnect_required', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('trial', 'personal');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('draft', 'trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'stalled');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('draft', 'active', 'paused');--> statement-breakpoint
CREATE TABLE "account_tokens" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"connected_account_id" varchar(120) NOT NULL,
	"encrypted_payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_policies" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"desired_policy_version" integer NOT NULL,
	"desired_policy_hash" varchar(180) NOT NULL,
	"desired_policy" jsonb NOT NULL,
	"runtime_status" varchar(64) NOT NULL,
	"runtime_summary" jsonb DEFAULT 'null'::jsonb,
	"last_observed_runtime" jsonb DEFAULT 'null'::jsonb,
	"last_observed_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"provider" "connected_account_provider" NOT NULL,
	"external_account_id" varchar(180) NOT NULL,
	"external_account_label" varchar(180) NOT NULL,
	"status" "connected_account_status" NOT NULL,
	"granted_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reconnect_reason" text,
	"last_successful_sync_at" timestamp with time zone,
	"last_sync_state" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_gates" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"key" varchar(120) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_snapshots" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"actor_membership_id" varchar(120),
	"policy_version" integer NOT NULL,
	"change_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"full_policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"provider_customer_id" varchar(180),
	"provider_subscription_id" varchar(180),
	"trial_ends_at" timestamp with time zone,
	"current_period_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"organization_id" varchar(120) NOT NULL,
	"connected_account_id" varchar(120),
	"kind" varchar(80) NOT NULL,
	"status" "sync_run_status" NOT NULL,
	"detail" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" "workspace_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_connected_account_id_connected_accounts_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_policies" ADD CONSTRAINT "agent_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_gates" ADD CONSTRAINT "feature_gates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_snapshots" ADD CONSTRAINT "policy_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_snapshots" ADD CONSTRAINT "policy_snapshots_actor_membership_id_memberships_id_fk" FOREIGN KEY ("actor_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connected_account_id_connected_accounts_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."connected_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_tokens_connected_account_idx" ON "account_tokens" USING btree ("connected_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_policies_org_idx" ON "agent_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_accounts_org_provider_idx" ON "connected_accounts" USING btree ("organization_id","provider","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_gates_org_key_idx" ON "feature_gates" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");