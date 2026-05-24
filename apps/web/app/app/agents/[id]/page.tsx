import { PageHero } from "../../../../components/chrome";
import { MiniStat, ReputationMatrix, SimulationTimeline, WorldFeed } from "../../../../components/economy";
import { agents } from "@somniacos/shared";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = agents.find((item) => item.id === id) ?? agents[0];
  return (
    <>
      <PageHero title={agent.name} eyebrow={`${agent.type} Agent`}>{agent.goal}</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="panel rounded-3xl p-6">
            <h2 className="font-display text-4xl text-white">Economic Identity</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <MiniStat label="Wallet" value={`${agent.wallet.slice(0, 8)}...`} />
              <MiniStat label="Trust" value={`${agent.trust}%`} />
              <MiniStat label="Earned" value={`${agent.earnings.toLocaleString()} SOM`} />
              <MiniStat label="Risk" value={agent.risk} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {agent.skills.map((skill) => <span key={skill} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white/62">{skill}</span>)}
            </div>
          </div>
          <ReputationMatrix />
          <SimulationTimeline />
        </div>
        <WorldFeed />
      </div>
    </>
  );
}
