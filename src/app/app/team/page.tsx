import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setMemberApprovalDelegation } from "@/app/actions/workspace-admin";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { listTeamMembers } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const viewerContext = await requireViewerContext();
  const teamMembers = await listTeamMembers(viewerContext.organizationId);
  const isOwner = viewerContext.role === "owner";

  return (
    <AppShell
      activeHref="/app/team"
      title="Team & Permissions"
      description="Owners, staff, and delegated approvers are visible roles, not hidden product state. This page shows how send authority is distributed."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6">
          <p className="eyebrow">Workspace roles</p>
          {teamMembers.length === 0 ? (
            <div className="mt-6 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
              <p className="text-base font-semibold text-[color:var(--foreground)]">
                No workspace memberships yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Real team memberships will appear here once the workspace is claimed
                and invites are accepted.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div>
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {member.name}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                      {member.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {member.canApprove ? (
                        <Badge>
                          {member.role === "staff"
                            ? "Delegated approver"
                            : "Can approve"}
                        </Badge>
                      ) : null}
                      <Badge>{member.role}</Badge>
                    </div>
                    {isOwner && member.role === "staff" ? (
                      <form
                        action={setMemberApprovalDelegation.bind(
                          null,
                          member.id,
                          !member.canApprove,
                        )}
                      >
                        <Button size="sm" type="submit" variant="secondary">
                          {member.canApprove
                            ? "Remove approval access"
                            : "Delegate approvals"}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                        {member.role === "owner"
                          ? "Owner authority"
                          : "Role managed"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Permission model</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            <p>
              Owners control billing, workspace settings, integrations, and
              approval delegation.
            </p>
            <p>
              Staff can prepare drafts, inspect history, and manage queue hygiene
              without gaining send authority.
            </p>
            <p>
              Approvers can review and approve outbound messages, including
              cross-channel actions from the dashboard and email alerts.
            </p>
            <p>
              {isOwner
                ? "This workspace is owner-managed. You can delegate or revoke approval authority for staff accounts directly from the role list."
                : "Only workspace owners can delegate or revoke approval authority. This page remains visible so the approval chain stays auditable."}
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
