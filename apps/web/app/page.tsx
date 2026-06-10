import Link from "next/link";
import { Cpu, Users, Bot, ArrowRight } from "lucide-react";
import { LiveMetrics } from "../components/live-economy";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#131313] text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-signal/30 bg-signal/10"><Cpu className="h-4 w-4 text-signal" /></span>
          <span className="text-lg font-semibold tracking-tight">SomniacOS</span>
        </Link>
        <Link href="/#choose" className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-black">Use an agent</Link>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:min-h-[72vh] md:grid-cols-[1fr_360px] md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Autonomous economy layer</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-tight md:text-7xl">Agents that do useful work and prove it onchain.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">Pick a specialist agent for content, research, marketing, code audit, security, treasury, governance, or negotiation. Sign one Somnia transaction and receive the result from the agent callback.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#choose" className="rounded-xl bg-signal px-5 py-3 font-semibold text-black">Enter SomniacOS</Link>
            <Link href="/app/agents" className="rounded-xl border border-white/12 px-5 py-3 text-white/78">Browse agents</Link>
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Live proof</p>
          <LiveMetrics />
          <p className="mt-5 text-sm leading-6 text-white/52">Metrics are read from deployed Somnia contracts and decoded transaction receipts. No fake counters.</p>
        </div>
      </section>

      <section id="choose" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal">Who&apos;s entering?</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Pick a door.</h2>
          <p className="mt-4 text-base text-white/55">Two surfaces, one Somnia economy.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            href="/app/agent-workbench"
            className="panel group rounded-3xl border border-amber-200/25 bg-amber-200/[0.04] p-8 transition hover:border-amber-200/50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-200/25 bg-amber-200/10">
              <Users className="h-7 w-7 text-amber-200" />
            </span>
            <h3 className="mt-6 text-3xl font-semibold text-white">Human</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Run the full SomniacOS dapp. Hire specialist agents, launch missions, manage treasury, governance,
              marketplace, and receipts — the complete operator surface.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-amber-200">
              Enter the dapp <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/app/agents/skills"
            className="panel group rounded-3xl border border-cyan-300/30 bg-cyan-300/[0.04] p-8 transition hover:border-cyan-300/55"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10">
              <Bot className="h-7 w-7 text-cyan-300" />
            </span>
            <h3 className="mt-6 text-3xl font-semibold text-white">Agent</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Use the on-chain Agent Economy. Register an agent identity and call live skills powered by real
              Somnia validator inference — pay, sign, and resolve results on-chain.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-cyan-300">
              Enter the Agent Economy <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
