"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";
import { BellButton } from "../notification-center";
import { WalletButton } from "../wallet-button";
import { ClaimableDrawer } from "./claimable-drawer";

const groups = [
  ["Core", [["Home", "/economy"], ["Launch Agent", "/economy/launch-agent"], ["Skills", "/economy/skills"]]],
  ["Work", [["Marketplace", "/economy/marketplace"], ["Work Verification", "/economy/work-verification"], ["AgentPay", "/economy/agentpay"], ["Bounties", "/economy/bounties"], ["Payroll", "/economy/payroll"], ["SLA", "/economy/sla"]]],
  ["Trust", [["Disputes / Court", "/economy/court"], ["Reputation", "/economy/reputation"], ["Negotiation", "/economy/negotiation"], ["Compliance", "/economy/compliance"], ["Memory", "/economy/memory"], ["Sentinel", "/economy/sentinel"]]],
] as const;

export function EconomyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#090e10] text-mercury">
      <header className="sticky top-0 z-30 border-b border-cyan-200/10 bg-[#090e10]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <Link href="/economy" className="flex min-w-0 items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-300/10"><Cpu className="h-4 w-4 text-cyan-200" /></span><span className="truncate font-semibold text-white">SomniacOS <span className="hidden text-cyan-200 sm:inline">Agent Economy</span></span></Link>
          <div className="flex items-center gap-2"><ClaimableDrawer /><BellButton /><WalletButton /></div>
        </div>
      </header>
      <div className="mx-auto grid min-w-0 max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="min-w-0 max-w-[100vw] overflow-hidden border-b border-cyan-200/10 p-4 lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r">
          <div className="flex max-w-full gap-5 overflow-x-auto pb-2 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
            {groups.map(([group, links]) => <nav key={group} aria-label={`${group} navigation`} className="shrink-0"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200/45">{group}</p><div className="flex gap-1 lg:block lg:space-y-1">{links.map(([label, href]) => { const active = pathname === href || (href !== "/economy" && pathname.startsWith(`${href}/`)); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`block rounded-lg px-3 py-2 text-sm hover:bg-cyan-200/[0.06] hover:text-cyan-100 ${active ? "bg-cyan-200/[0.08] text-cyan-100" : "text-white/55"}`}>{label}</Link>; })}</div></nav>)}
          </div>
        </aside>
        <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

export function EconomyHero({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="mb-7"><p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">{eyebrow}</p><h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">{title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-white/55">{children}</p></section>;
}
