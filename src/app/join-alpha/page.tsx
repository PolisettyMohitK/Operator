import { joinAlphaReasons } from "@/lib/operator/site-content";
import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function JoinAlphaPage() {
  return (
    <MarketingFrame>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="eyebrow">Join alpha</p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--foreground)] md:text-6xl">
            For businesses that actually want the workflow, not just the AI story.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[color:var(--muted-foreground)]">
            Operator is for owners and small teams who are still doing revenue
            follow-up by hand and want the first serious product version.
          </p>
          <div className="mt-10 grid gap-4">
            {joinAlphaReasons.map((reason) => (
              <Card key={reason.title} className="flex gap-4 p-5">
                <div className="rounded-full bg-[color:rgba(24,59,78,0.08)] p-3 text-[color:var(--accent)]">
                  <reason.icon className="size-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
                    {reason.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {reason.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <p className="eyebrow">Request access</p>
          <div className="mt-6 grid gap-4">
            {["Business name", "Website or profile", "Primary workflow pain", "Team size", "Best contact email"].map(
              (field) => (
                <label key={field} className="grid gap-2 text-sm font-medium text-[color:var(--foreground)]">
                  <span>{field}</span>
                  <input
                    className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
                    placeholder={field}
                  />
                </label>
              ),
            )}
          </div>
          <Button className="mt-6 w-full">Submit alpha request</Button>
          <p className="mt-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
            This form is intentionally static until the real alpha intake backend
            is wired. The production build will store and route these requests.
          </p>
        </Card>
      </section>
    </MarketingFrame>
  );
}
