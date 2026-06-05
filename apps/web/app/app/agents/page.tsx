import Link from "next/link";
import { PageHero } from "../../../components/chrome";
import { curatedAgents } from "../../../lib/agent-engine";

export default function AgentsPage() {
  return (
    <>
      <PageHero title="Specialist Agents" eyebrow="Somnia runtime">Choose a purpose-built agent. Each one can run missions, use saved context, produce proof-backed outputs, and hand work to another specialist.</PageHero>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {curatedAgents.map((agent) => (
          <article key={agent.id} className="panel rounded-2xl p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">{agent.role}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{agent.name}</h2>
            <p className="mt-3 min-h-20 text-sm leading-6 text-white/55">{agent.promise}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-white/45">{skill}</span>)}
            </div>
            <div className="mt-5 space-y-2 text-sm text-white/62">
              {agent.examples.map((example) => <p key={example}>- {example}</p>)}
            </div>
            <Link href={agent.id === "token-launcher" ? "/app/missions?mission=launch-token" : `/app/agent-workbench?agent=${agent.id}`} className="mt-5 inline-flex rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-black">{agent.id === "token-launcher" ? "Open mission" : "Run task"}</Link>
          </article>
        ))}
      </div>
    </>
  );
}
