import { PageHero } from "../../../components/chrome";
import { AgentWorkbench } from "../../../components/agent-workbench";

export default function MissionsPage() {
  return (
    <>
      <PageHero title="Missions" eyebrow="Agent-to-agent workflows">Run structured mission templates such as token launch, project launch, audit, research, and wallet safety. Mission-specific UI appears after selection.</PageHero>
      <AgentWorkbench mode="missions" />
    </>
  );
}
