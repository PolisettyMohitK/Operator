import { AppShell } from "@/components/app/app-shell";
import { saveReminderCadence } from "@/app/actions/workspace-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEFAULT_REMINDER_POLICY } from "@/lib/operator/datalayer/workspace-admin";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getOnboardingDisplayState } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const viewerContext = await requireViewerContext();
  const onboarding = await getOnboardingDisplayState(viewerContext.organizationId);
  const isOwner = viewerContext.role === "owner";
  const reminderPolicy = onboarding.reminderPolicy ?? DEFAULT_REMINDER_POLICY;

  return (
    <AppShell
      activeHref="/app/settings"
      title="Self-serve onboarding"
      description="This is the first-run Operator flow: twelve opinionated steps that move a small business from disconnected tools to an active approval system."
    >
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <Card className="p-6">
          <p className="eyebrow">12-step setup</p>
          {onboarding.steps.length === 0 ? (
            <div className="mt-5 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-4">
              <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
                No onboarding checkpoints have been stored for this workspace yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {onboarding.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3"
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-semibold text-[color:var(--accent-foreground)]">
                    {step.position}
                  </span>
                  <span className="text-sm font-medium text-[color:var(--foreground)]">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Step preview</p>
              <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                Flexible Google Sheets mapping
              </h2>
            </div>
            <Badge>{onboarding.connectedToolCount} tools connected</Badge>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {onboarding.mappedColumns.map((item) => (
              <label
                key={item.label}
                className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]"
              >
                <span>{item.label}</span>
                <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                  {item.value}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-8 rounded-[24px] border border-dashed border-[color:var(--border-strong)] bg-[color:rgba(24,59,78,0.04)] p-5">
            <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
              {onboarding.reminderPolicy
                ? `Reminder policy is set to urgent after ${onboarding.reminderPolicy.urgentAfterDays} days, stale after ${onboarding.reminderPolicy.staleAfterDays} days, with ${onboarding.reminderPolicy.minimumSpacingDays} days minimum spacing between follow-ups. ${onboarding.approverCount} approver accounts are currently active in this workspace.`
                : "Reminder cadence has not been saved yet. Once a policy and approvers are configured, Operator will activate sync with the workspace rules shown here."}
            </p>
          </div>

          <form action={saveReminderCadence}>
            <div className="mt-8 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Reminder cadence</p>
                  <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                    Urgent, stale, and spacing thresholds
                  </h3>
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  {isOwner ? "Owner editable" : "Read only"}
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    Urgent after
                  </span>
                  <input
                    className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                    defaultValue={reminderPolicy.urgentAfterDays}
                    disabled={!isOwner}
                    min={1}
                    name="urgentAfterDays"
                    required
                    type="number"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    Stale after
                  </span>
                  <input
                    className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                    defaultValue={reminderPolicy.staleAfterDays}
                    disabled={!isOwner}
                    min={1}
                    name="staleAfterDays"
                    required
                    type="number"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[color:var(--foreground)]">
                    Minimum spacing
                  </span>
                  <input
                    className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                    defaultValue={reminderPolicy.minimumSpacingDays}
                    disabled={!isOwner}
                    min={1}
                    name="minimumSpacingDays"
                    required
                    type="number"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-5">
                <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                  {isOwner
                    ? `There are currently ${onboarding.approverCount} active approver account${onboarding.approverCount === 1 ? "" : "s"} in this workspace. Saving cadence here changes when invoices escalate into urgent and stale lanes.`
                    : "Reminder cadence is visible to the whole team, but only workspace owners can change it."}
                </p>
                <Button disabled={!isOwner} type="submit">
                  Save cadence
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
