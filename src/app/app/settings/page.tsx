import { AppShell } from "@/components/app/app-shell";
import { saveWorkspaceSettings } from "@/app/actions/workspace-admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { materializeChannelPolicyDefaults } from "@/lib/operator/datalayer/workspace-admin";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getSettingsDisplayState } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewerContext = await requireViewerContext();
  const settings = await getSettingsDisplayState(viewerContext.organizationId);
  const isOwner = viewerContext.role === "owner";
  const channelPolicies = materializeChannelPolicyDefaults(settings.channelStates);
  const toneGuidance = settings.toneGuidance || viewerContext.toneGuidance;

  return (
    <AppShell
      activeHref="/app/settings"
      title="Settings"
      description="Operator remembers tone, cadence, and delivery policy as part of the workspace operating model."
    >
      <form action={saveWorkspaceSettings}>
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <p className="eyebrow">Communication policy</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
              Tone and reminder posture
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
              This guidance becomes the steady voice Operator uses when it drafts
              follow-ups and escalations for this workspace.
            </p>
            <label className="mt-6 grid gap-2">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                Tone guidance
              </span>
              <textarea
                className="min-h-[200px] rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                defaultValue={toneGuidance}
                disabled={!isOwner}
                name="toneGuidance"
                required
              />
            </label>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Channel behavior</p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  Approval surfaces and fallback rules
                </h2>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                {isOwner ? "Owner editable" : "Read only"}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {channelPolicies.map((item) => (
                <div
                  key={item.channel}
                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div className="grid gap-4 md:grid-cols-[0.45fr_1fr]">
                    <label className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                        {item.channel}
                      </span>
                      <input
                        className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm font-medium text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                        defaultValue={item.state}
                        disabled={!isOwner}
                        name={`channel:${item.channel}:state`}
                        required
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                        Operator note
                      </span>
                      <textarea
                        className="min-h-[120px] rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-70"
                        defaultValue={item.note}
                        disabled={!isOwner}
                        name={`channel:${item.channel}:note`}
                        required
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-5">
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
                {isOwner
                  ? "Saving here updates the live workspace policy. Queue copy, approval prompts, and dashboard guidance will all read from this source of truth."
                  : "Only workspace owners can change delivery policy. Everyone else sees the current operating rules here."}
              </p>
              <Button disabled={!isOwner} type="submit">
                Save workspace policy
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </AppShell>
  );
}
