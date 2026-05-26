import { PageHero } from "../../../components/chrome";
import { AgentWorkbench } from "../../../components/agent-workbench";

export default function AgentWorkbenchPage() {
  return (
    <>
      <PageHero title="Agent Workbench" eyebrow="Somnia Agents">Pick a specialist, give it a task, sign one Somnia transaction, and wait for the onchain agent callback.</PageHero>
      <AgentWorkbench />
    </>
  );
}
