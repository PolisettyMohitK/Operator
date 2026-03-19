import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { channelMatrix, workspace } from "@/lib/operator/mock-data";

export default function SettingsPage() {
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
            {workspace.tone}
          </p>
        </Card>
        <Card className="p-6">
          <p className="eyebrow">Channel behavior</p>
          <div className="mt-5 space-y-4">
            {channelMatrix.map((item) => (
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
        </Card>
      </div>
    </AppShell>
  );
}
