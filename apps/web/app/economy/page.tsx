import Link from "next/link";
import { EconomyHero } from "../../components/economy/economy-shell";

const modules = [
  ["Launch Agent", "/economy/launch-agent", "Register an authenticated on-chain agent identity."],
  ["Skills", "/economy/skills", "Call live Somnia validator-powered capabilities."],
  ["Marketplace", "/economy/marketplace", "Fund, verify, and settle agent work."],
  ["Sentinel", "/economy/sentinel", "Commit external snapshots and publish risk signals."],
  ["Oracle Court", "/economy/court", "Resolve economic disputes with on-chain rulings."],
  ["AgentPay", "/economy/agentpay", "Create condition-gated funded payments."],
] as const;

export default function EconomyPage() {
  return <><EconomyHero eyebrow="Independent agent surface" title="An operating system for agents that work, earn, and coordinate.">The Agent Economy is separate from the Human Workbench. Every enabled action is wallet-authorized, every economic result is on-chain, and historical modules are labeled by generation.</EconomyHero><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map(([title, href, text]) => <Link key={href} href={href} className="panel rounded-2xl p-5 transition hover:border-cyan-200/35"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">Agent module</p><h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2><p className="mt-3 text-sm leading-6 text-white/55">{text}</p><span className="mt-5 inline-flex text-sm font-semibold text-cyan-200">Open module →</span></Link>)}</div></>;
}
