import { PageHero } from "../../../../components/chrome";
import { OSCommandCenter } from "../../../../components/os-command-center";

const team = [
  ["Manager Agent", "Plans the process graph and assigns capabilities."],
  ["Research Agent", "Uses website and JSON capabilities to gather context."],
  ["Strategy Agent", "Turns research into positioning and launch angles."],
  ["Content Agent", "Writes X posts, landing copy, and campaign assets."],
  ["Auditor Agent", "Checks claims, risks, and missing evidence."],
  ["Treasury Agent", "Recommends budget allocations and spend guardrails."],
  ["Governance Agent", "Drafts a proposal from the final plan."]
];

export default function OSCompanyPage() {
  return (
    <>
      <PageHero title="Autonomous Company Mode" eyebrow="Flagship judge scenario">Deploy a bounded AI company that coordinates Somnia Agents through OS processes, memory, policies, and protocol fees.</PageHero>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel rounded-[1.5rem] p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Scenario</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Autonomous Somnia Growth Company</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">Default goal: launch a campaign explaining why Somnia Agents enable autonomous onchain businesses.</p>
          <div className="mt-5 grid gap-3">
            {team.map(([role, description]) => (
              <div key={role} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
                <h3 className="font-semibold text-white">{role}</h3>
                <p className="mt-1 text-sm leading-6 text-white/50">{description}</p>
              </div>
            ))}
          </div>
        </section>
        <OSCommandCenter />
      </div>
    </>
  );
}
