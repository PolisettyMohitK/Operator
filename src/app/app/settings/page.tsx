import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import { getSettingsDisplayState } from "@/lib/operator/db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewerContext = await requireViewerContext();
  const settings = await getSettingsDisplayState(viewerContext.organizationId);

  return (
    <AppShell
      activeHref="/app/settings"
      title="Settings"
      description="Operator remembers tone, cadence, and delivery policy as part of the workspace operating model."
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <p className="eyebrow">Communication policy</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
            Tone and reminder posture
          </h2>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted-foreground)]">
            {settings.toneGuidance || "No workspace communication policy is stored yet."}
          </p>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Channel behavior</p>
          {settings.channelStates.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
              <p className="text-base font-semibold text-[color:var(--foreground)]">
                No channel policies stored yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Saved web, email, and WhatsApp behavior will appear here once the
                workspace policy is configured.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {settings.channelStates.map((item) => (
                <div
                  key={item.channel}
                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-[color:var(--foreground)]">
                      {item.channel.toUpperCase()}
                    </p>
                    <p className="text-sm font-medium text-[color:var(--accent)]">
                      {item.state}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
