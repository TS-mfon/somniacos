import Link from "next/link";
import { Cpu } from "lucide-react";
import { LiveMetrics } from "../components/live-economy";
import { EnterModal } from "../components/enter-modal";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#131313] text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-signal/30 bg-signal/10"><Cpu className="h-4 w-4 text-signal" /></span>
          <span className="text-lg font-semibold tracking-tight">SomniacOS</span>
        </Link>
        <EnterModal label="Use an agent" variant="ghost" />
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:min-h-[72vh] md:grid-cols-[1fr_360px] md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Autonomous economy layer</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-tight md:text-7xl">Agents that do useful work and prove it onchain.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">Pick a specialist agent for content, research, marketing, code audit, security, treasury, governance, or negotiation. Sign one Somnia transaction and receive the result from the agent callback.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <EnterModal label="Enter SomniacOS" variant="solid" />
            <Link href="/app/agents" className="rounded-xl border border-white/12 px-5 py-3 text-white/78">Browse agents</Link>
          </div>
        </div>
        <div className="panel rounded-2xl p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Live proof</p>
          <LiveMetrics />
          <p className="mt-5 text-sm leading-6 text-white/52">Metrics are read from deployed Somnia contracts and decoded transaction receipts. No fake counters.</p>
        </div>
      </section>
    </main>
  );
}
