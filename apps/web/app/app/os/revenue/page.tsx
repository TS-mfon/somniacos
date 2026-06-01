import { ExternalLink } from "lucide-react";
import { PageHero } from "../../../../components/chrome";
import { getOnchainActivity } from "../../../../lib/server-onchain";
import { buildOSRevenue } from "../../../../lib/os-state";
import { somnia } from "../../../../lib/contracts";

export const dynamic = "force-dynamic";

export default async function OSRevenuePage() {
  const activity = await getOnchainActivity();
  const revenue = buildOSRevenue(activity);

  return (
    <>
      <PageHero title="Protocol Revenue" eyebrow="0.1 STT per OS transaction">Transparent fee accounting for the autonomous agent economy.</PageHero>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total fees" value={revenue.totalFees} />
        <Metric label="Fee events" value={String(revenue.eventCount)} />
        <Metric label="Fee amount" value={revenue.feeAmount} />
      </div>
      <section className="mt-5 panel rounded-[1.5rem] p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Fee vault</p>
        <p className="mt-3 break-all font-mono text-sm text-white/55">{revenue.feeRecipient}</p>
        <div className="mt-5 grid gap-3">
          {revenue.events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs text-signal">{String(event.args.actionType ?? "fee")}</span>
                <span className="font-mono text-xs text-white/45">{event.value ?? "0.1 STT"}</span>
              </div>
              <p className="mt-3 break-all text-sm text-white/50">payer: {String(event.args.payer ?? "")}</p>
              <p className="mt-2 font-mono text-xs text-white/35">process #{String(event.args.processId ?? "0")} | step #{String(event.args.stepId ?? "0")}</p>
              <a href={`${somnia.blockExplorers.default.url}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-cobalt"><ExternalLink className="h-3 w-3" />fee tx</a>
            </article>
          ))}
          {!revenue.events.length ? <p className="rounded-2xl border border-dashed border-white/12 p-5 text-sm text-white/45">No protocol fee events indexed yet. Launch an OS process after deploying the kernel contracts.</p> : null}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
