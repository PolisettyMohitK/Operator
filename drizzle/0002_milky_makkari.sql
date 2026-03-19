ALTER TABLE "organizations" ADD COLUMN "clerk_organization_id" varchar(120);--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_idx" ON "memberships" USING btree ("organization_id","clerk_user_id");--> statement-breakpoint
CREATE INDEX "memberships_clerk_user_idx" ON "memberships" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_org_id_idx" ON "organizations" USING btree ("clerk_organization_id");