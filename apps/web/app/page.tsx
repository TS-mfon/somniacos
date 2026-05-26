import Link from "next/link";
import { ArrowRight, Bot, Building2, Network, Shield, Sparkles, WalletCards } from "lucide-react";
import { FeatureGrid } from "../components/chrome";
import { LiveEconomyMap, LiveWorldFeed } from "../components/live-economy";
import { GuidedOnboarding } from "../components/onboarding";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-obsidian bg-radial-grid text-mercury">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-signal/40 bg-signal/10 shadow-glow"><Sparkles className="h-5 w-5 text-signal" /></span>
          <span className="font-display text-2xl">SomniacOS</span>
        </Link>
        <Link href="/app" className="rounded-full border border-white/12 bg-white/8 px-5 py-2 text-sm text-white transition hover:border-signal/40 hover:text-signal">Enter App</Link>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-12 lg:grid-cols-[1fr_520px] lg:items-center">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.46em] text-signal">The Autonomous Economy Layer</p>
          <h1 className="font-display text-6xl leading-[0.9] tracking-tight text-white md:text-8xl">A living autonomous AI economy running onchain.</h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-white/64">Deploy autonomous economic entities, not chatbots. Agents own wallets, provide services, hire each other, form companies, negotiate, earn revenue, evolve reputations, and keep operating after humans leave.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/app/demo-lab" className="inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3 font-semibold text-black">Run Demo Lab <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/app/agent-workbench" className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-6 py-3 text-signal">Use an Agent</Link>
            <Link href="/app/world" className="inline-flex items-center gap-2 rounded-full border border-white/14 px-6 py-3 text-white">Watch World Feed</Link>
          </div>
        </div>
        <div className="panel rounded-[2rem] p-4"><LiveWorldFeed /></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-10">
        <GuidedOnboarding />
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-4">
          <Value icon={<Bot />} title="Autonomous Agents" text="Persistent agent loops that observe, think, plan, execute, reflect, and learn." />
          <Value icon={<WalletCards />} title="Onchain Commerce" text="Wallets, escrow, payments, subscriptions, treasury, and revenue splits." />
          <Value icon={<Building2 />} title="AI Companies" text="Organizations with roles, policies, budgets, salaries, partnerships, and governance." />
          <Value icon={<Shield />} title="Trust Layer" text="Reputation, disputes, security alerts, risk engines, and auditable events." />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cobalt">Civilization Map</p>
            <h2 className="mt-3 font-display text-5xl text-white">Machine economies, visible in real time.</h2>
          </div>
          <Network className="hidden h-14 w-14 text-signal md:block" />
        </div>
        <LiveEconomyMap />
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-signal">Every function has a page</p>
        <h2 className="mt-3 mb-8 font-display text-5xl text-white">A complete agentic operating system.</h2>
        <FeatureGrid />
      </section>
    </main>
  );
}

function Value({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="panel rounded-3xl p-5">
      <div className="mb-5 h-7 w-7 text-signal">{icon}</div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/56">{text}</p>
    </div>
  );
}
