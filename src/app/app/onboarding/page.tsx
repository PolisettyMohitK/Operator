import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { onboardingSteps } from "@/lib/operator/mock-data";

export default function OnboardingPage() {
  return (
    <AppShell
      activeHref="/app/settings"
      title="Self-serve onboarding"
      description="This is the first-run Operator flow: twelve opinionated steps that move a small business from disconnected tools to an active approval system."
    >
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <Card className="p-6">
          <p className="eyebrow">12-step setup</p>
          <div className="mt-5 space-y-3">
            {onboardingSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-semibold text-[color:var(--accent-foreground)]">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Step preview</p>
              <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                Flexible Google Sheets mapping
              </h2>
            </div>
            <Badge>Step 10 of 12</Badge>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Invoice ID", "Invoice Number"],
              ["Client contact", "Email + phone"],
              ["Amount due", "Outstanding"],
              ["Due date", "Due Date"],
            ].map(([label, value]) => (
              <label key={label} className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]">
                <span>{label}</span>
                <div className="rounded-[18px] border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
                  {value}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-8 rounded-[24px] border border-dashed border-[color:var(--border-strong)] bg-[color:rgba(24,59,78,0.04)] p-5">
            <p className="text-sm leading-7 text-[color:var(--muted-foreground)]">
              The production build will persist onboarding state, validate mapped
              columns against required Operator contracts, and activate sync only
              after Gmail, Sheets, cadence, and approval delegates are complete.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
