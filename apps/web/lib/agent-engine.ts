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

export type AgentRunRecord = {
  requestId: string;
  user: string;
  appAgentId: string;
  task: string;
  constraints: string;
  url: string;
  somniaAgentId: string;
  mode: "LLM" | "Website";
  status: "Pending" | "Success" | "Failed" | "TimedOut";
  result: string;
  createdAt: string;
  completedAt: string;
  txHash?: string;
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

export function readableAgentLabel(agentId: string) {
  return curatedAgents.find((agent) => agent.id === agentId)?.role ?? labelFromUri(agentId);
}

