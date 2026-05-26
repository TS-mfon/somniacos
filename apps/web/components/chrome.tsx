import Link from "next/link";
import { Cpu } from "lucide-react";
import { WalletButton } from "./wallet-button";

const navItems = [
  ["Agents", "/app/agents"],
  ["Workbench", "/app/agent-workbench"],
  ["Tasks", "/app/marketplace"],
  ["Activity", "/app/world"],
  ["Wallet", "/app/settings"]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#131313] text-mercury">
      <main>
        <TopBar />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#131313]/92 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-signal/30 bg-signal/10"><Cpu className="h-4 w-4 text-signal" /></span>
          <span className="text-lg font-semibold tracking-tight text-white">SomniacOS</span>
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-white/58 transition hover:bg-white/[0.06] hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

export function PageHero({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.24em] text-signal">{eyebrow}</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/58">{children}</p>
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return null;
}
