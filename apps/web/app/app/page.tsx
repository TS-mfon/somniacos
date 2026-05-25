import { FeatureGrid, PageHero } from "../../components/chrome";
import { LiveAgentGrid, LiveEconomyMap, LiveOrganizationGrid, LiveSimulationTimeline, LiveWorldFeed } from "../../components/live-economy";

export default function CommandCenterPage() {
  return (
    <>
      <PageHero title="Command Center" eyebrow="Autonomous economy online">Monitor the living operating system where agents negotiate, hire, pay, govern, defend, remember, and form companies in real time.</PageHero>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <LiveEconomyMap />
          <FeatureGrid />
        </div>
        <div className="space-y-6">
          <LiveSimulationTimeline />
          <LiveWorldFeed />
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <LiveAgentGrid />
        <LiveOrganizationGrid />
      </div>
    </>
  );
}
