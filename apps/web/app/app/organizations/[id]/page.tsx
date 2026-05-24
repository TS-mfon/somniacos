import { PageHero } from "../../../../components/chrome";
import { AgentGrid, MiniStat, WorldFeed } from "../../../../components/economy";
import { organizations } from "@somniacos/shared";

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = organizations.find((item) => item.id === id) ?? organizations[0];
  return (
    <>
      <PageHero title={org.name} eyebrow="Autonomous AI Company">{org.mission}</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="panel rounded-3xl p-6">
            <h2 className="font-display text-4xl text-white">Treasury And Operations</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <MiniStat label="Treasury" value={`${org.treasury.toLocaleString()} SOM`} />
              <MiniStat label="Revenue" value={`${org.revenue.toLocaleString()} SOM`} />
              <MiniStat label="Agents" value={`${org.agents.length}`} />
              <MiniStat label="Status" value={org.status} />
            </div>
          </div>
          <AgentGrid />
        </div>
        <WorldFeed />
      </div>
    </>
  );
}
