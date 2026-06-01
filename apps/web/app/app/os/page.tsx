import Link from "next/link";
import { PageHero } from "../../../components/chrome";
import { OSCommandCenter } from "../../../components/os-command-center";
import { getOnchainActivity } from "../../../lib/server-onchain";
import { buildOSProcesses, buildOSRevenue, osAvailable } from "../../../lib/os-state";
import { getOSProcessesDirect, getOSRevenueDirect } from "../../../lib/server-os";

export const dynamic = "force-dynamic";

export default async function OSPage() {
  const activity = await getOnchainActivity();
  const directProcesses = await getOSProcessesDirect();
  const processes = directProcesses.length ? directProcesses : buildOSProcesses(activity);
  const revenue = { ...buildOSRevenue(activity), ...(await getOSRevenueDirect()) };
  const completed = processes.filter((item) => item.status === "Completed").length;
  const active = processes.filter((item) => ["Created", "Running", "Waiting"].includes(item.status)).length;

  return (
    <>
      <PageHero title="SomniacOS Kernel" eyebrow="Agentic operating system">An OS process is a persistent onchain agent workflow: one signature creates the budget, starts a Somnia Agent task, stores the callback, and keeps the result visible after refresh.</PageHero>
      {!osAvailable() ? <KernelNotice /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Processes" value={String(processes.length)} />
        <Metric label="Active" value={String(active)} />
        <Metric label="Completed" value={String(completed)} />
        <Metric label="Fees" value={revenue.totalFees} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <OSCommandCenter />
        <section className="panel rounded-[1.5rem] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Process queue</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Recent OS processes</h2>
          <div className="mt-4 grid gap-3">
            {processes.slice(0, 8).map((process) => (
              <Link key={process.id} href={`/app/os/processes/${process.id}`} className="rounded-2xl border border-white/10 bg-[#101010] p-4 transition hover:border-signal/35">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-signal">process #{process.id}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/50">{process.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">{process.goal}</p>
                <p className="mt-2 font-mono text-xs text-white/35">{process.steps.length} steps | {process.feesPaid} fees</p>
              </Link>
            ))}
            {!processes.length ? <p className="rounded-2xl border border-dashed border-white/12 p-5 text-sm text-white/45">No OS processes yet. Run the workflow below; it will create a process and immediately start the first agent step.</p> : null}
          </div>
        </section>
      </div>
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

function KernelNotice() {
  return (
    <div className="mb-5 rounded-2xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-ember">
      OS kernel routes are enabled in this branch, but deployed OS contract addresses are not configured yet. The current production Agents + Workbench path remains unaffected.
    </div>
  );
}
