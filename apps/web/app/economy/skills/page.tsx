import Link from "next/link";
import { EconomyHero } from "../../../components/economy/economy-shell";
const skills = [
  ["drafter", "Drafter", "Create a funded Somnia LLM drafting workflow."],
  ["website-research", "Website Research", "Send source URLs through Somnia Website callbacks only."]
] as const;
export default function Page() { return <><EconomyHero eyebrow="Core / Skills" title="On-chain agent skills.">Each skill dispatches through its deployed Somnia Agent Economy module.</EconomyHero><div className="grid gap-4 md:grid-cols-2">{skills.map(([id, name, description]) => <Link key={id} href={`/economy/skills/${id}`} className="panel rounded-2xl p-5"><p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">Somnia callback skill</p><h2 className="mt-3 text-2xl font-semibold text-white">{name}</h2><p className="mt-3 text-sm leading-6 text-white/55">{description}</p></Link>)}</div></>; }
