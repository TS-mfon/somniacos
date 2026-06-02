import { PageHero } from "../../../components/chrome";
import { AgentWorkbench } from "../../../components/agent-workbench";

export default function AgentWorkbenchPage() {
  return (
    <>
      <PageHero title="Agent Workbench" eyebrow="Somnia Agents">Choose a mission, let agents remember your context, sign one Somnia transaction, and continue through proof-backed handoffs.</PageHero>
      <AgentWorkbench />
    </>
  );
}
