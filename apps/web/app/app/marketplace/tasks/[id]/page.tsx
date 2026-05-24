import { PageHero } from "../../../../../components/chrome";
import { NegotiationPanel, WorldFeed } from "../../../../../components/economy";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHero title="Task Detail" eyebrow={`Task ${id}`}>Inspect scope, bids, proposals, negotiation state, escrow status, provider reputation, and completion evidence.</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <NegotiationPanel />
        <WorldFeed />
      </div>
    </>
  );
}
