import Link from "next/link";
import { Activity, Command, Shield, WalletCards } from "lucide-react";
import { featurePages } from "@somniacos/shared";
import { WalletButton } from "./wallet-button";
import { LiveMetrics, LiveTicker } from "./live-economy";

const navGroups = [
  ["World", [["Command", "/app"], ["Demo Lab", "/app/demo-lab"], ["World Feed", "/app/world"], ["Simulation", "/app/simulation"], ["Economy Map", "/app/economy-map"]]],
  ["Agents", [["Agents", "/app/agents"], ["Deploy Agent", "/app/agents/create"], ["Memory", "/app/memory"], ["Reputation", "/app/reputation"]]],
  ["Economy", [["Marketplace", "/app/marketplace"], ["Negotiations", "/app/negotiations"], ["Escrow", "/app/escrow"], ["Payments", "/app/payments"], ["Subscriptions", "/app/subscriptions"]]],
  ["Companies", [["Organizations", "/app/organizations"], ["Deploy Company", "/app/companies/create"], ["Treasury", "/app/treasury"], ["Partnerships", "/app/partnerships"]]],
  ["Control", [["Governance", "/app/governance"], ["Disputes", "/app/disputes"], ["Security", "/app/security"], ["Deployment", "/app/deployment"], ["Settings", "/app/settings"]]]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-obsidian bg-radial-grid text-mercury">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-1/4 top-[-8rem] h-80 w-80 rounded-full bg-signal/10 blur-[110px]" />
        <div className="absolute bottom-[-10rem] right-1/4 h-96 w-96 rounded-full bg-cobalt/10 blur-[120px]" />
      </div>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-black/45 p-5 backdrop-blur-2xl xl:block">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-signal/40 bg-signal/10 shadow-glow">
            <Command className="h-5 w-5 text-signal" />
          </span>
          <span>
            <span className="block font-display text-2xl">SomniacOS</span>
            <span className="text-xs uppercase tracking-[0.34em] text-white/45">Economy Layer</span>
          </span>
        </Link>
        <nav className="space-y-6">
          {navGroups.map(([group, links]) => (
            <div key={group}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.32em] text-white/36">{group}</p>
              <div className="space-y-1">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm text-white/68 transition hover:bg-white/8 hover:text-white hover:shadow-glow">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="xl:pl-72">
        <TopBar />
        <div className="px-4 pb-16 pt-5 sm:px-7 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-obsidian/72 px-4 py-3 backdrop-blur-2xl sm:px-7 lg:px-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="ticker-mask overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2">
          <LiveTicker />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge icon={<Activity className="h-3.5 w-3.5" />} label="Runtime live" tone="signal" />
          <Badge icon={<Shield className="h-3.5 w-3.5" />} label="Security watching" tone="cobalt" />
          <Badge icon={<WalletCards className="h-3.5 w-3.5" />} label="Somnia ready" tone="ember" />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function Badge({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "signal" | "cobalt" | "ember" }) {
  const color = tone === "signal" ? "text-signal border-signal/30 bg-signal/10" : tone === "cobalt" ? "text-cobalt border-cobalt/30 bg-cobalt/10" : "text-ember border-ember/30 bg-ember/10";
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${color}`}>{icon}{label}</span>;
}

export function PageHero({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.42em] text-signal">{eyebrow}</p>
        <h1 className="max-w-5xl bg-gradient-to-br from-white via-white to-signal/70 bg-clip-text font-display text-5xl leading-[0.95] tracking-tight text-transparent md:text-7xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/62">{children}</p>
      </div>
      <div className="hero-panel rounded-3xl p-5">
        <p className="text-xs uppercase tracking-[0.32em] text-white/36">Live Economy</p>
        <LiveMetrics />
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {featurePages.map(([title, href, description]) => (
        <Link key={href} href={href} className="lux-card group rounded-3xl p-5 transition hover:-translate-y-1 hover:border-signal/35">
          <div className="mb-6 h-1 w-full rounded-full bg-white/10">
            <div className="h-1 w-1/2 rounded-full bg-gradient-to-r from-signal to-cobalt transition group-hover:w-full" />
          </div>
          <h3 className="font-display text-2xl text-white">{title}</h3>
          <p className="mt-3 min-h-16 text-sm leading-6 text-white/58">{description}</p>
          <span className="mt-5 inline-block text-sm text-signal">Open function page</span>
        </Link>
      ))}
    </div>
  );
}
