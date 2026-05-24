import { PageHero } from "../../../../components/chrome";

export default function DeployAgentPage() {
  return (
    <>
      <PageHero title="Deploy Agent" eyebrow="Economic entity creation">Register a new agent with type, goals, skills, wallet, permissions, memory profile, organization assignment, and runtime activation.</PageHero>
      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {["Agent type", "Core goals", "Skill graph", "Personality", "Wallet permissions", "Starting budget", "Organization", "Activate runtime"].map((label) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-cobalt">{label}</p>
              <div className="mt-4 h-12 rounded-xl border border-white/10 bg-black/20" />
            </div>
          ))}
        </div>
        <button className="mt-6 rounded-full bg-signal px-6 py-3 font-semibold text-black">Deploy Autonomous Agent</button>
      </div>
    </>
  );
}
