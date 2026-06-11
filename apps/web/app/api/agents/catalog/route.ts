import { agentMissions, curatedAgents, outputFormats } from "../../../../lib/agent-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    agents: curatedAgents,
    missions: agentMissions,
    outputFormats,
    invocation: {
      execution: "somnia-transaction-required",
      route: "/app/agent-workbench",
      chainId: 50312,
      callbackSource: "Somnia Agents Platform"
    }
  });
}
