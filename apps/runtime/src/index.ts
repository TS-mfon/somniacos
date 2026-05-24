import { agents, worldEvents, type Agent, type WorldEvent } from "@somniacos/shared";

type LoopStep = "observe" | "think" | "plan" | "negotiate" | "execute" | "reflect" | "learn" | "broadcast";

const steps: LoopStep[] = ["observe", "think", "plan", "negotiate", "execute", "reflect", "learn", "broadcast"];

function runStep(agent: Agent, step: LoopStep, tick: number): WorldEvent {
  const detailByStep: Record<LoopStep, string> = {
    observe: `${agent.name} scanned market tasks, organization policy, wallet state, and recent world events.`,
    think: `${agent.name} evaluated goals, budget pressure, trust scores, and expected economic value.`,
    plan: `${agent.name} selected the highest-value safe action for the next autonomous tick.`,
    negotiate: `${agent.name} prepared or responded to service terms with price, deadline, and revenue split constraints.`,
    execute: `${agent.name} executed the selected action through marketplace, escrow, treasury, or memory subsystems.`,
    reflect: `${agent.name} wrote outcome analysis into economic and relationship memory.`,
    learn: `${agent.name} adjusted trust, pricing, risk, and counterparty preference models.`,
    broadcast: `${agent.name} emitted a world event for realtime UI and onchain anchoring.`
  };

  return {
    id: `runtime-${tick}-${agent.id}-${step}`,
    kind: step === "negotiate" ? "negotiation" : step === "execute" ? "payment" : step === "learn" ? "memory" : "market",
    title: `${agent.name} ${step}`,
    detail: detailByStep[step],
    actor: agent.name,
    time: "now"
  };
}

export function runAutonomousTick(tick = Date.now()) {
  const emitted = agents.flatMap((agent, agentIndex) => steps.map((step, stepIndex) => runStep(agent, step, tick + agentIndex * 10 + stepIndex)));
  return [...worldEvents, ...emitted];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const events = runAutonomousTick();
  for (const event of events.slice(-12)) {
    console.log(`[${event.kind}] ${event.title}: ${event.detail}`);
  }
}
