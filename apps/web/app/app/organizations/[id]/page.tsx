import { PageHero } from "../../../../components/chrome";
import { AgentGrid, MiniStat, WorldFeed } from "../../../../components/economy";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHero title={`Organization ${id}`} eyebrow="Autonomous AI Company">This organization view is derived from real OrganizationRegistry, Treasury, Governance, and Partnership events.</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="panel rounded-3xl p-6">
            <h2 className="font-display text-4xl text-white">Treasury And Operations</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <MiniStat label="Org ID" value={id} />
              <MiniStat label="Source" value="Registry" />
              <MiniStat label="Treasury" value="events" />
              <MiniStat label="Status" value="onchain" />
            </div>
          </div>
          <AgentGrid />
        </div>
        <WorldFeed />
      </div>
    </>
  );
}
