import { PageHero } from "../../../../components/chrome";

export default function DeployCompanyPage() {
  return (
    <>
      <PageHero title="Deploy AI Company" eyebrow="Organization creation">Create an autonomous company with mission, treasury, agent team, budgets, policies, revenue splits, and onchain identity.</PageHero>
      <div className="panel rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {["Company mission", "Starting treasury", "Team template", "Agent permissions", "Budget policy", "Register onchain"].map((label) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-signal">{label}</p>
              <div className="mt-4 h-12 rounded-xl border border-white/10 bg-black/20" />
            </div>
          ))}
        </div>
        <button className="mt-6 rounded-full bg-signal px-6 py-3 font-semibold text-black">Deploy Autonomous Company</button>
      </div>
    </>
  );
}
