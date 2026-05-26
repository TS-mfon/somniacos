import { labelFromUri, type AgentState } from "./onchain-state";

export type AgentTaskType = "marketing" | "research" | "content" | "code-audit" | "security-audit" | "treasury" | "governance" | "negotiation";

export type CuratedAgent = {
  id: string;
  name: string;
  role: string;
  taskType: AgentTaskType;
  skills: string[];
  promise: string;
  examples: string[];
  onchainMatch: string[];
};

export type AgentTaskInput = {
  curatedAgent: CuratedAgent;
  onchainAgent?: AgentState;
  goal: string;
  constraints: string;
};

export type AgentTaskOutput = {
  id: string;
  agentId: string;
  agentName: string;
  taskType: AgentTaskType;
  title: string;
  prompt: string;
  summary: string;
  deliverables: string[];
  recommendedOnchainAction: string;
  metadataURI: string;
  riskNotes: string[];
  createdAt: string;
};

export const curatedAgents: CuratedAgent[] = [
  {
    id: "marketing-strategist",
    name: "Vector Marketing",
    role: "Marketing Strategist",
    taskType: "marketing",
    skills: ["positioning", "campaign strategy", "growth loops"],
    promise: "Turns rough ideas into launch strategy, channels, hooks, and measurable next steps.",
    examples: ["Create a launch plan", "Position a product", "Find campaign angles"],
    onchainMatch: ["growth", "market", "strategy", "marketing"]
  },
  {
    id: "content-writer",
    name: "Signal Scribe",
    role: "Content Writer",
    taskType: "content",
    skills: ["x posts", "threads", "landing copy", "content briefs"],
    promise: "Writes concise posts, threads, landing blurbs, and creative concepts.",
    examples: ["Write an X post about dogs", "Draft launch copy", "Create a thread"],
    onchainMatch: ["copywriting", "content", "image-generation"]
  },
  {
    id: "research-analyst",
    name: "Atlas Research",
    role: "Research Analyst",
    taskType: "research",
    skills: ["market research", "competitor analysis", "summaries"],
    promise: "Produces structured briefs with findings, assumptions, and recommended decisions.",
    examples: ["Research competitors", "Summarize a market", "Compare two products"],
    onchainMatch: ["research", "analytics", "intelligence"]
  },
  {
    id: "code-auditor",
    name: "Byte Auditor",
    role: "Code Auditor",
    taskType: "code-audit",
    skills: ["code review", "smart contract review", "test planning"],
    promise: "Reviews code for risks, missing tests, and practical fixes.",
    examples: ["Audit Solidity code", "Review an API route", "Find test gaps"],
    onchainMatch: ["security", "threat", "audit"]
  },
  {
    id: "security-auditor",
    name: "Sentinel",
    role: "Security Auditor",
    taskType: "security-audit",
    skills: ["threat detection", "incident response", "fraud signals"],
    promise: "Turns suspicious behavior into severity, evidence, and mitigation steps.",
    examples: ["Classify a threat", "Draft incident response", "Audit suspicious transactions"],
    onchainMatch: ["security", "threat", "fraud"]
  },
  {
    id: "treasury-planner",
    name: "Vault Planner",
    role: "Treasury Planner",
    taskType: "treasury",
    skills: ["budgeting", "runway", "spend controls"],
    promise: "Creates budget splits, runway policy, and treasury guardrails.",
    examples: ["Split a campaign budget", "Create spend rules", "Plan runway"],
    onchainMatch: ["treasury", "budget", "escrow"]
  },
  {
    id: "governance-drafter",
    name: "Policy Forge",
    role: "Governance Drafter",
    taskType: "governance",
    skills: ["proposals", "voting rationale", "policy writing"],
    promise: "Drafts clear governance proposals with outcome and voting rationale.",
    examples: ["Write a DAO proposal", "Draft policy", "Create vote rationale"],
    onchainMatch: ["governance", "voting", "disputes"]
  },
  {
    id: "negotiation-agent",
    name: "Deal Mesh",
    role: "Negotiation Agent",
    taskType: "negotiation",
    skills: ["offers", "counteroffers", "terms"],
    promise: "Builds prices, deadlines, fallback positions, and negotiation terms.",
    examples: ["Write an offer", "Counter a proposal", "Summarize terms"],
    onchainMatch: ["pricing", "arbitrage", "competitive", "hiring"]
  }
];

export function matchOnchainAgent(agent: CuratedAgent, onchainAgents: AgentState[]) {
  return onchainAgents.find((candidate) => {
    const haystack = `${candidate.name} ${candidate.skills.join(" ")} ${candidate.metadataURI}`.toLowerCase();
    return agent.onchainMatch.some((term) => haystack.includes(term));
  });
}

export function runLocalAgentTask(input: AgentTaskInput): AgentTaskOutput {
  const goal = clean(input.goal, "Create a useful output for the user's request.");
  const constraints = clean(input.constraints, "Keep it practical, concise, and safe to publish.");
  const onchainLabel = input.onchainAgent ? `Onchain agent #${input.onchainAgent.id}` : "Curated app agent";
  const id = `out-${Date.now().toString(36)}-${input.curatedAgent.id}`;
  const deliverables = buildDeliverables(input.curatedAgent.taskType, goal, constraints);

  return {
    id,
    agentId: input.onchainAgent?.id ?? input.curatedAgent.id,
    agentName: input.curatedAgent.name,
    taskType: input.curatedAgent.taskType,
    title: `${input.curatedAgent.role}: ${labelFromUri(`somniacos://${input.curatedAgent.taskType}`)}`,
    prompt: goal,
    summary: `${input.curatedAgent.name} completed the task as ${onchainLabel}. The output is ready below; anchoring writes the recoverable result payload to Somnia.`,
    deliverables,
    recommendedOnchainAction: recommendedAction(input.curatedAgent.taskType),
    metadataURI: `somniacos://agent-output/${input.curatedAgent.id}/${slug(goal).slice(0, 48)}`,
    riskNotes: riskNotes(input.curatedAgent.taskType),
    createdAt: new Date().toISOString()
  };
}

export type AnchoredOutputPayload = {
  version: 1;
  output: AgentTaskOutput;
};

export function encodeOutputPayload(output: AgentTaskOutput) {
  const payload: AnchoredOutputPayload = { version: 1, output };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:application/json;base64,${btoa(binary)}`;
}

export function decodeOutputPayload(metadataURI: unknown): AgentTaskOutput | null {
  if (typeof metadataURI !== "string" || !metadataURI.startsWith("data:application/json;base64,")) return null;
  try {
    const encoded = metadataURI.replace("data:application/json;base64,", "");
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as AnchoredOutputPayload;
    return payload.version === 1 ? payload.output : null;
  } catch {
    return null;
  }
}

function buildDeliverables(type: AgentTaskType, goal: string, constraints: string) {
  if (type === "content") return contentOutput(goal, constraints);
  if (type === "marketing") return [
    `Positioning: Frame "${goal}" around one sharp audience pain and one concrete outcome.`,
    `Campaign: Publish one proof-led post, one comparison post, and one CTA post over 48 hours.`,
    `Metric: Track replies, saves, and click-through before spending more budget.`
  ];
  if (type === "research") return [
    `Research question: What decision does "${goal}" need to support?`,
    `Findings: Separate confirmed facts from assumptions, then rank by decision impact.`,
    `Recommendation: Use the smallest next test that can disprove the riskiest assumption.`
  ];
  if (type === "code-audit") return [
    `Review focus: Check authorization, input validation, error handling, and state transitions for "${goal}".`,
    `Likely risks: missing tests, unhandled failure states, unsafe assumptions, and unclear rollback path.`,
    `Acceptance: Add direct tests for happy path, failure path, and permission boundaries.`
  ];
  if (type === "security-audit") return [
    `Severity: Start at medium until transaction evidence proves loss, exploitability, or malicious intent.`,
    `Evidence: Capture tx hashes, addresses, timestamps, affected contracts, and observed behavior.`,
    `Mitigation: Pause risky action, open dispute if funds are involved, and record a world event.`
  ];
  if (type === "treasury") return [
    `Budget: Allocate 70% to proven work, 20% to experiments, 10% to reserve.`,
    `Guardrail: Require explicit result criteria before releasing escrow.`,
    `Runway: Reassess spend after every completed marketplace task.`
  ];
  if (type === "governance") return [
    `Title: Proposal to improve execution for "${goal}".`,
    `Policy: Define the change, owner, success metric, and expiry condition.`,
    `Vote rationale: Approve only if it improves transparency, safety, or measurable output.`
  ];
  return [
    `Opening offer: State price, deadline, deliverable, and acceptance criteria in one paragraph.`,
    `Counter position: Reduce scope before increasing price.`,
    `Fallback: If terms remain vague, do not fund escrow.`
  ];
}

function contentOutput(goal: string, constraints: string) {
  const lower = goal.toLowerCase();
  if (lower.includes("x post") || lower.includes("tweet") || lower.includes("post")) {
    if (lower.includes("dog")) {
      return [
        "X post: Dogs do not need a pitch deck to earn trust. They show up, stay loyal, read the room, and make the day better. More products should be built with that kind of simple, dependable energy.",
        "Alt version: A good dog is basically the perfect startup advisor: high attention, zero politics, instant feedback, and a strict policy against boring walks.",
        `Publishing note: Keep the post warm, specific, and under 280 characters. Constraint honored: ${constraints}`
      ];
    }
    return [
      `X post: ${goal.replace(/\.$/, "")}. Make the point fast, keep the language human, and end with a line people can repeat.`,
      "Alt hook: The best posts do not explain everything. They make one sharp idea impossible to ignore.",
      `Publishing note: Keep one idea per post. Constraint honored: ${constraints}`
    ];
  }
  return [
    `Content brief: Write for people who care about ${goal}, not for everyone.`,
    "Draft angle: Lead with the outcome, prove it with one detail, and close with a direct next step.",
    `Distribution: Publish once as a short post, once as a thread, and once as landing copy. Constraint honored: ${constraints}`
  ];
}

function recommendedAction(type: AgentTaskType) {
  if (type === "content") return "Anchor the final content as a world event if you want public proof of the agent output.";
  if (type === "code-audit" || type === "security-audit") return "Record a security or audit event, then open a dispute only if funds or reputation are at risk.";
  if (type === "marketing" || type === "research") return "Post a marketplace task or record the result as a public world event.";
  if (type === "treasury") return "Fund treasury or set an agent budget only after checking organization and agent IDs.";
  if (type === "governance") return "Create a governance proposal using the generated title, policy, and rationale.";
  return "Open a negotiation with price, deadline, and terms after reviewing the generated position.";
}

function riskNotes(type: AgentTaskType) {
  if (type === "code-audit" || type === "security-audit") return ["This is not a formal security audit.", "Verify evidence before taking punitive action."];
  if (type === "treasury") return ["Use small STT amounts for demos.", "Confirm recipient and organization IDs before signing."];
  return ["Review output before publishing.", "Anchoring makes the payload public onchain."];
}

function clean(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "task";
}
