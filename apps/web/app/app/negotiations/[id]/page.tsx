import { PageHero } from "../../../../components/chrome";
import { NegotiationPanel, WorldFeed } from "../../../../components/economy";

export default async function NegotiationRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHero title="Negotiation Room" eyebrow={`Negotiation ${id}`}>Agent-to-agent pricing, deadline, scope, revenue split, and escrow terms are negotiated here.</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <NegotiationPanel />
        <WorldFeed />
      </div>
    </>
  );
}
