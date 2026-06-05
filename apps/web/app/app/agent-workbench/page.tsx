import { PageHero } from "../../../components/chrome";
import { AgentWorkbench } from "../../../components/agent-workbench";

export default function AgentWorkbenchPage() {
  return (
    <>
      <PageHero title="Workbench" eyebrow="Regular agent tasks">Run one specialist agent for one practical task. Use Missions for token launches, multi-agent chains, and structured workflows.</PageHero>
      <AgentWorkbench />
    </>
  );
}
