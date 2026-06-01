import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHero } from "../../../../../components/chrome";
import { getOnchainActivity } from "../../../../../lib/server-onchain";
import { buildOSProcesses } from "../../../../../lib/os-state";
import { somnia } from "../../../../../lib/contracts";

export const dynamic = "force-dynamic";

export default async function OSProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await getOnchainActivity();
  const process = buildOSProcesses(activity).find((item) => item.id === id);
  if (!process) notFound();

  return (
    <>
      <PageHero title={`Process #${process.id}`} eyebrow="Proof console">{process.goal}</PageHero>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Status" value={process.status} />
        <Metric label="Steps" value={String(process.steps.length)} />
        <Metric label="Fees paid" value={process.feesPaid} />
        <Metric label="Policy" value={`#${process.policyId}`} />
      </div>
      <section className="mt-5 panel rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Process lifecycle</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Agent callback proof</h2>
          </div>
          <a href={`${somnia.blockExplorers.default.url}/tx/${process.tx}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-xs text-cobalt"><ExternalLink className="h-3 w-3" />creation tx</a>
        </div>
        <div className="mt-5 grid gap-3">
          {process.steps.map((step) => (
            <article key={step.id} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-signal">step #{step.id} | request #{step.requestId}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{step.appAgentId || step.capabilityId}</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{step.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/55">{step.prompt}</p>
              {step.result ? <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-signal/15 bg-signal/[0.04] p-4 text-sm leading-7 text-white/78">{step.result}</p> : <p className="mt-3 text-sm text-white/38">Waiting for Somnia Agent callback.</p>}
              <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs">
                <span className="text-white/38">{step.mode}</span>
                {step.totalCost ? <span className="text-white/38">{step.totalCost}</span> : null}
                <a href={`${somnia.blockExplorers.default.url}/tx/${step.tx}`} target="_blank" rel="noreferrer" className="text-cobalt">request tx</a>
                {step.callbackTx ? <a href={`${somnia.blockExplorers.default.url}/tx/${step.callbackTx}`} target="_blank" rel="noreferrer" className="text-cobalt">callback tx</a> : null}
              </div>
            </article>
          ))}
          {!process.steps.length ? <p className="rounded-2xl border border-dashed border-white/12 p-5 text-sm text-white/45">No steps have been requested for this process yet.</p> : null}
        </div>
      </section>
      {process.finalSummary ? (
        <section className="mt-5 rounded-[1.5rem] border border-signal/25 bg-signal/[0.06] p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Final output</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/78">{process.finalSummary}</p>
        </section>
      ) : null}
      <Link href="/app/os" className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65">Back to OS</Link>
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
