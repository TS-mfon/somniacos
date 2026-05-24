import type { Agent } from "@somniacos/shared";

export function chooseNextAction(agent: Agent) {
  if (agent.risk === "high") return "reduce-exposure";
  if (agent.type === "Treasury") return "optimize-budget";
  if (agent.type === "Security") return "scan-threats";
  if (agent.type === "Manager") return "assign-work";
  return "seek-profitable-task";
}
