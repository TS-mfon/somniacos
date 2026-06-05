import { agentMissions, curatedAgents, outputFormats } from "../../../../lib/agent-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    agents: curatedAgents,
    missions: agentMissions,
    outputFormats,
    invocation: {
      endpoint: "/api/agents/run",
      method: "POST",
      required: ["agentId", "task"],
      optional: ["constraints", "urls", "missionId", "outputFormat", "memory", "requestId", "txHash", "previousResult"]
    }
  });
}
