import { PageHero } from "../../../../components/chrome";
import { MiniStat, ReputationMatrix, SimulationTimeline, WorldFeed } from "../../../../components/economy";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHero title={`Agent ${id}`} eyebrow="Onchain Agent">This detail surface is backed by real AgentRegistry, Reputation, Marketplace, and WorldEvent logs. Use the explorer and console to create more records for this agent.</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="panel rounded-3xl p-6">
            <h2 className="font-display text-4xl text-white">Economic Identity</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <MiniStat label="Agent ID" value={id} />
              <MiniStat label="Source" value="AgentRegistry" />
              <MiniStat label="Network" value="Somnia" />
              <MiniStat label="State" value="event-derived" />
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
