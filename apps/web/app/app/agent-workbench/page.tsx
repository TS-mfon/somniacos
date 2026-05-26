import { PageHero } from "../../../components/chrome";
import { AgentWorkbench } from "../../../components/agent-workbench";

export default function AgentWorkbenchPage() {
  return (
    <>
      <PageHero title="Agent Workbench" eyebrow="Use an agent">Pick a live onchain agent, give it a plain-language task, receive structured work, and optionally anchor the output to Somnia with your wallet.</PageHero>
      <AgentWorkbench />
    </>
  );
}
