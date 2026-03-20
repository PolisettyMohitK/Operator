import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getAccountDisplayState } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewerContext = await requireViewerContext();
  const account = await getAccountDisplayState(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/account"
      title="Account"
      description="The paid V1 account model is explicit: each workspace moves from draft setup to active invoice recovery before any background execution is allowed."
    >
      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                {account?.businessName ?? viewerContext.businessName}
              </h2>
            </div>
            <Badge>{account?.workspaceStatus ?? "Draft"}</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {[
              {
                label: "Workspace label",
                value: account?.workspaceLabel ?? viewerContext.workspaceLabel,
              },
              {
                label: "Owner",
                value: account?.ownerName ?? viewerContext.ownerName,
              },
              {
                label: "Created",
                value: account?.createdAt ?? "Not available",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  {item.label}
                </p>
                <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="eyebrow">Provisioning lifecycle</p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
            Paid V1 replaces implicit workspace creation with a controlled setup flow
          </h2>
          <ol className="mt-6 grid gap-4 text-sm leading-7 text-[color:var(--foreground)]">
            {[
              "Create a draft workspace and owner membership.",
              "Complete business profile and invoice onboarding.",
              "Connect Gmail and Google Sheets.",
              "Start the trial or activate a paid subscription.",
              "Materialize the managed OpenClaw policy and mark the workspace active.",
            ].map((item, index) => (
              <li
                key={item}
                className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
              >
                <span className="mr-3 font-semibold text-[color:var(--accent)]">
                  0{index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
