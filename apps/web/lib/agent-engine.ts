import { labelFromUri, type AgentState } from "./onchain-state";

export type AgentTaskType = "marketing" | "research" | "code" | "security" | "treasury" | "governance" | "negotiation" | "content";

export type AgentTaskInput = {
  agent?: AgentState;
  taskType: AgentTaskType;
  goal: string;
  constraints: string;
};

export type AgentTaskOutput = {
  title: string;
  summary: string;
  deliverables: string[];
  recommendedOnchainAction: string;
  metadataURI: string;
  riskNotes: string[];
};

const playbooks: Record<AgentTaskType, { action: string; deliverables: string[]; risks: string[] }> = {
  marketing: {
    action: "Post a marketplace task for creative production, then fund escrow after selecting a provider.",
    deliverables: ["Audience hypothesis", "Three campaign angles", "A measurable next action"],
    risks: ["Do not overspend before engagement is measured.", "Require escrow before delivery."]
  },
  research: {
    action: "Record a world event with the research conclusion and create a subscription if recurring monitoring is needed.",
    deliverables: ["Question framing", "Findings summary", "Decision recommendation"],
    risks: ["Mark uncertain claims as assumptions.", "Refresh data before high-value spend."]
  },
  code: {
    action: "Create a task with acceptance criteria and assign a provider agent after proposal review.",
    deliverables: ["Implementation plan", "Test checklist", "Review risks"],
    risks: ["Require explicit acceptance criteria.", "Do not release escrow before tests pass."]
  },
  security: {
    action: "Record a security world event and open a dispute if funds or reputation are at risk.",
    deliverables: ["Threat classification", "Evidence checklist", "Mitigation steps"],
    risks: ["Do not accuse counterparties without transaction evidence.", "Escalate high-risk treasury activity."]
  },
  treasury: {
    action: "Fund treasury, set budget, then record budget rationale as a world event.",
    deliverables: ["Budget allocation", "Runway note", "Spend guardrail"],
    risks: ["Keep small testnet amounts for demos.", "Avoid funding wrong organization IDs."]
  },
  governance: {
    action: "Create a governance proposal with clear metadata and route stakeholders to vote.",
    deliverables: ["Proposal title", "Policy change", "Voting rationale"],
    risks: ["Avoid vague proposals.", "Check organization ID before voting."]
  },
  negotiation: {
    action: "Open a negotiation, update terms after counteroffer, then fund escrow only after agreement.",
    deliverables: ["Opening offer", "Counterparty terms", "Fallback position"],
    risks: ["Do not accept undefined deadlines.", "Keep price within budget."]
  },
  content: {
    action: "Post a content task or record final creative direction as a world event.",
    deliverables: ["Content brief", "Draft copy", "Distribution plan"],
    risks: ["Avoid unverifiable performance claims.", "Keep content aligned with agent goals."]
  }
};

export function runLocalAgentTask(input: AgentTaskInput): AgentTaskOutput {
  const agentName = input.agent?.name ?? "SomniacOS Agent";
  const skills = input.agent?.skills.length ? input.agent.skills.join(", ") : "general autonomous execution";
  const playbook = playbooks[input.taskType];
  const cleanGoal = input.goal.trim() || "Complete the requested user task safely and economically.";
  const constraints = input.constraints.trim() || "Use a low-risk plan, keep the user in control, and anchor important actions onchain.";

  return {
    title: `${agentName} ${labelFromUri(`somniacos://${input.taskType}`)} Run`,
    summary: `${agentName} analyzed the task using skills: ${skills}. Goal: ${cleanGoal}. Constraints: ${constraints}. The recommended route is to complete the offchain reasoning first, then write only the economic commitment or proof event onchain.`,
    deliverables: playbook.deliverables.map((item, index) => `${index + 1}. ${item}: ${buildDeliverable(input.taskType, cleanGoal, constraints, item)}`),
    recommendedOnchainAction: playbook.action,
    metadataURI: `somniacos://agent-output/${input.taskType}/${slug(cleanGoal).slice(0, 48)}`,
    riskNotes: playbook.risks
  };
}

function buildDeliverable(type: AgentTaskType, goal: string, constraints: string, label: string) {
  if (type === "marketing") return `${label} for "${goal}" with a test budget and one measurable conversion signal.`;
  if (type === "research") return `${label} focused on "${goal}" and bounded by "${constraints}".`;
  if (type === "code") return `${label} covering build, verification, and rollback for "${goal}".`;
  if (type === "security") return `${label} for suspicious behavior around "${goal}".`;
  if (type === "treasury") return `${label} using conservative allocation and explicit spend limits.`;
  if (type === "governance") return `${label} written as a proposal voters can understand in one pass.`;
  if (type === "negotiation") return `${label} with price, deadline, and acceptance criteria.`;
  return `${label} tailored to "${goal}".`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "task";
}
