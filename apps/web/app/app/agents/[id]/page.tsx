import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "../../../../components/chrome";
import { curatedAgents, missionsForAgent } from "../../../../lib/agent-engine";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = curatedAgents.find((item) => item.id === id);
  if (!agent) notFound();
  const missions = missionsForAgent(agent.id);
  const actionHref = agent.id === "token-launcher" ? "/app/missions?mission=launch-token" : `/app/agent-workbench?agent=${agent.id}`;

  return (
    <>
      <PageHero title={agent.name} eyebrow={agent.role}>{agent.promise}</PageHero>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel rounded-[1.5rem] p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">Public agent profile</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">What this agent can do</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {agent.skills.map((skill) => <span key={skill} className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-white/50">{skill}</span>)}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {agent.examples.map((example) => (
              <div key={example} className="rounded-2xl border border-white/10 bg-[#101010] p-4 text-sm text-white/62">{example}</div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/35">Default constraints</p>
            <p className="mt-2 text-sm leading-6 text-white/62">{agent.defaultConstraints}</p>
          </div>
          <Link href={actionHref} className="mt-6 inline-flex rounded-xl bg-signal px-5 py-3 text-sm font-semibold text-black">{agent.id === "token-launcher" ? "Open Launch Token Mission" : "Run in Workbench"}</Link>
        </section>
        <aside className="space-y-4">
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Capability mapping</p>
            <p className="mt-3 text-sm leading-6 text-white/55">Category: {agent.category}</p>
            <p className="mt-2 text-sm leading-6 text-white/55">Task type: {agent.taskType}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.onchainMatch.map((term) => <span key={term} className="rounded-full border border-signal/20 bg-signal/10 px-3 py-1 font-mono text-[11px] text-signal">{term}</span>)}
            </div>
          </div>
          <div className="panel rounded-[1.5rem] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Compatible missions</p>
            <div className="mt-4 grid gap-2">
              {missions.map((mission) => (
                <Link key={mission.id} href={`/app/missions?mission=${mission.id}`} className="rounded-xl border border-white/10 bg-[#101010] p-3 transition hover:border-signal/35">
                  <span className="block text-sm font-semibold text-white">{mission.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/45">{mission.description}</span>
                </Link>
              ))}
              {!missions.length ? <p className="text-sm text-white/45">This agent currently runs as a standalone Workbench specialist.</p> : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
