import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { teamMembers } from "@/lib/operator/mock-data";

export default function TeamPage() {
  return (
    <AppShell
      activeHref="/app/team"
      title="Team & Permissions"
      description="Owners, staff, and delegated approvers are visible roles, not hidden product state. This page shows how send authority is distributed."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6">
          <p className="eyebrow">Workspace roles</p>
          <div className="mt-6 space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
              >
                <div>
                  <p className="text-base font-semibold text-[color:var(--foreground)]">
                    {member.name}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                    {member.id}
                  </p>
                </div>
                <Badge>{member.role}</Badge>
              </div>
            ))}
          </div>
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
              cross-channel actions from email and WhatsApp.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
