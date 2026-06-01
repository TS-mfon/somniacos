import { labelFromUri, type AgentState } from "./onchain-state";

export type AgentTaskType =
  | "marketing"
  | "research"
  | "content"
  | "code-audit"
  | "security-audit"
  | "treasury"
  | "governance"
  | "negotiation"
  | "token-research"
  | "wallet-risk"
  | "defi-yield"
  | "tx-explainer"
  | "portfolio"
  | "airdrop"
  | "email"
  | "travel"
  | "study"
  | "career"
  | "meeting"
  | "productivity";

export type CuratedAgent = {
  id: string;
  name: string;
  role: string;
  taskType: AgentTaskType;
  skills: string[];
  promise: string;
  examples: string[];
  onchainMatch: string[];
  category: "Crypto" | "Work" | "Life" | "Builder";
  defaultTask: string;
  defaultConstraints: string;
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
  source?: "Somnia" | "LLM API";
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
    onchainMatch: ["growth", "market", "strategy", "marketing"],
    category: "Work",
    defaultTask: "Create a one-week launch strategy for a new crypto product.",
    defaultConstraints: "Include target audience, hooks, channels, budget priorities, and measurable next steps."
  },
  {
    id: "content-writer",
    name: "Signal Scribe",
    role: "Content Writer",
    taskType: "content",
    skills: ["x posts", "threads", "landing copy", "content briefs"],
    promise: "Writes concise posts, threads, landing blurbs, and creative concepts.",
    examples: ["Write an X post about dogs", "Draft launch copy", "Create a thread"],
    onchainMatch: ["copywriting", "content", "image-generation"],
    category: "Work",
    defaultTask: "Write an X post about dogs.",
    defaultConstraints: "Keep it warm, concise, and ready to publish."
  },
  {
    id: "research-analyst",
    name: "Atlas Research",
    role: "Research Analyst",
    taskType: "research",
    skills: ["market research", "competitor analysis", "summaries"],
    promise: "Produces structured briefs with findings, assumptions, and recommended decisions.",
    examples: ["Research competitors", "Summarize a market", "Compare two products"],
    onchainMatch: ["research", "analytics", "intelligence"],
    category: "Work",
    defaultTask: "Research the current positioning of Somnia Agents.",
    defaultConstraints: "Return a concise brief with findings, risks, and recommendations."
  },
  {
    id: "code-auditor",
    name: "Byte Auditor",
    role: "Code Auditor",
    taskType: "code-audit",
    skills: ["code review", "smart contract review", "test planning"],
    promise: "Reviews code for risks, missing tests, and practical fixes.",
    examples: ["Audit Solidity code", "Review an API route", "Find test gaps"],
    onchainMatch: ["security", "threat", "audit"],
    category: "Builder",
    defaultTask: "Audit this Solidity or TypeScript snippet for bugs and missing tests.",
    defaultConstraints: "Prioritize exploitable bugs, runtime failures, and concrete fixes."
  },
  {
    id: "security-auditor",
    name: "Sentinel",
    role: "Security Auditor",
    taskType: "security-audit",
    skills: ["threat detection", "incident response", "fraud signals"],
    promise: "Turns suspicious behavior into severity, evidence, and mitigation steps.",
    examples: ["Classify a threat", "Draft incident response", "Audit suspicious transactions"],
    onchainMatch: ["security", "threat", "fraud"],
    category: "Crypto",
    defaultTask: "Review a suspicious wallet or transaction pattern for risk.",
    defaultConstraints: "Classify severity, evidence, likely causes, and safe next actions."
  },
  {
    id: "treasury-planner",
    name: "Vault Planner",
    role: "Treasury Planner",
    taskType: "treasury",
    skills: ["budgeting", "runway", "spend controls"],
    promise: "Creates budget splits, runway policy, and treasury guardrails.",
    examples: ["Split a campaign budget", "Create spend rules", "Plan runway"],
    onchainMatch: ["treasury", "budget", "escrow"],
    category: "Crypto",
    defaultTask: "Create a treasury plan for a small crypto project with 1000 STT budget.",
    defaultConstraints: "Include spend categories, runway assumptions, controls, and risk limits."
  },
  {
    id: "governance-drafter",
    name: "Policy Forge",
    role: "Governance Drafter",
    taskType: "governance",
    skills: ["proposals", "voting rationale", "policy writing"],
    promise: "Drafts clear governance proposals with outcome and voting rationale.",
    examples: ["Write a DAO proposal", "Draft policy", "Create vote rationale"],
    onchainMatch: ["governance", "voting", "disputes"],
    category: "Crypto",
    defaultTask: "Draft a DAO proposal to fund an agent-run community growth program.",
    defaultConstraints: "Include proposal summary, budget, success metrics, risks, and vote rationale."
  },
  {
    id: "negotiation-agent",
    name: "Deal Mesh",
    role: "Negotiation Agent",
    taskType: "negotiation",
    skills: ["offers", "counteroffers", "terms"],
    promise: "Builds prices, deadlines, fallback positions, and negotiation terms.",
    examples: ["Write an offer", "Counter a proposal", "Summarize terms"],
    onchainMatch: ["pricing", "arbitrage", "competitive", "hiring"],
    category: "Work",
    defaultTask: "Create negotiation terms for hiring a content agent for one week.",
    defaultConstraints: "Include opening offer, fallback, deadline, deliverables, and red lines."
  },
  {
    id: "token-researcher",
    name: "Token Lens",
    role: "Token Research Analyst",
    taskType: "token-research",
    skills: ["token research", "narratives", "risk summary"],
    promise: "Turns token or protocol research into a balanced, non-financial research brief.",
    examples: ["Research a token", "Compare narratives", "Summarize protocol risks"],
    onchainMatch: ["research", "analytics", "token"],
    category: "Crypto",
    defaultTask: "Research a crypto token or protocol and explain the main narrative.",
    defaultConstraints: "Do not give financial advice. Include utility, risks, catalysts, and unknowns."
  },
  {
    id: "wallet-risk-scanner",
    name: "Wallet Sentinel",
    role: "Wallet Risk Scanner",
    taskType: "wallet-risk",
    skills: ["wallet hygiene", "approval risk", "security checklist"],
    promise: "Explains wallet safety risks and practical next steps for normal users.",
    examples: ["Check wallet risk", "Explain approvals", "Create safety checklist"],
    onchainMatch: ["security", "wallet", "fraud"],
    category: "Crypto",
    defaultTask: "Create a wallet safety checklist before interacting with a new dApp.",
    defaultConstraints: "Make it practical for a non-technical user. Include red flags and safe actions."
  },
  {
    id: "defi-yield-scout",
    name: "Yield Scout",
    role: "DeFi Yield Scout",
    taskType: "defi-yield",
    skills: ["yield comparison", "risk scoring", "DeFi planning"],
    promise: "Compares DeFi opportunities by mechanism and risk, without pretending returns are guaranteed.",
    examples: ["Compare yield options", "Explain risks", "Plan allocation"],
    onchainMatch: ["treasury", "yield", "defi"],
    category: "Crypto",
    defaultTask: "Compare three DeFi yield strategies for a conservative user.",
    defaultConstraints: "No financial advice. Explain mechanism, risk, liquidity, and monitoring needs."
  },
  {
    id: "transaction-explainer",
    name: "Tx Decoder",
    role: "Onchain Transaction Explainer",
    taskType: "tx-explainer",
    skills: ["transaction explanation", "event decoding", "plain English"],
    promise: "Explains what a transaction likely did in language a visitor can understand.",
    examples: ["Explain this tx", "Decode events", "Summarize gas and value"],
    onchainMatch: ["analytics", "transaction", "research"],
    category: "Crypto",
    defaultTask: "Explain an onchain transaction to a non-technical user.",
    defaultConstraints: "Summarize actors, value moved, contract interactions, risk, and what to verify."
  },
  {
    id: "portfolio-planner",
    name: "Portfolio Compass",
    role: "Portfolio Planner",
    taskType: "portfolio",
    skills: ["allocation planning", "risk limits", "rebalancing"],
    promise: "Creates a sober portfolio plan with risk controls and review cadence.",
    examples: ["Plan allocation", "Set risk rules", "Create review checklist"],
    onchainMatch: ["treasury", "budget", "portfolio"],
    category: "Crypto",
    defaultTask: "Create a simple crypto portfolio planning framework.",
    defaultConstraints: "No financial advice. Include risk buckets, position limits, and review cadence."
  },
  {
    id: "airdrop-planner",
    name: "Quest Mapper",
    role: "Airdrop Quest Planner",
    taskType: "airdrop",
    skills: ["quest planning", "user journey", "risk controls"],
    promise: "Turns ecosystem tasks into an organized, low-risk participation plan.",
    examples: ["Plan quests", "Track tasks", "Avoid scams"],
    onchainMatch: ["research", "growth", "quest"],
    category: "Crypto",
    defaultTask: "Create a safe weekly plan for exploring a new crypto ecosystem.",
    defaultConstraints: "Avoid scammy behavior. Include wallet safety, task tracking, and time budget."
  },
  {
    id: "email-writer",
    name: "Inbox Forge",
    role: "Email Writer",
    taskType: "email",
    skills: ["cold email", "follow-ups", "support replies"],
    promise: "Writes clear emails with the right tone and next action.",
    examples: ["Write cold email", "Reply politely", "Follow up"],
    onchainMatch: ["content", "copywriting"],
    category: "Work",
    defaultTask: "Write a concise partnership outreach email.",
    defaultConstraints: "Keep it professional, specific, and under 160 words."
  },
  {
    id: "travel-planner",
    name: "Route Craft",
    role: "Travel Planner",
    taskType: "travel",
    skills: ["itineraries", "budget planning", "local research"],
    promise: "Creates practical itineraries with timing, budget, and tradeoffs.",
    examples: ["Plan weekend trip", "Compare cities", "Create itinerary"],
    onchainMatch: ["research", "planning"],
    category: "Life",
    defaultTask: "Plan a three-day trip for a first-time visitor.",
    defaultConstraints: "Include daily schedule, budget notes, food, transport, and backup options."
  },
  {
    id: "study-tutor",
    name: "Tutor Loop",
    role: "Study Tutor",
    taskType: "study",
    skills: ["explanations", "practice plans", "quizzes"],
    promise: "Explains hard topics and turns them into a study plan.",
    examples: ["Explain concept", "Make quiz", "Create study plan"],
    onchainMatch: ["research", "education"],
    category: "Life",
    defaultTask: "Teach me a difficult topic step by step.",
    defaultConstraints: "Use simple language, examples, a short quiz, and a 7-day practice plan."
  },
  {
    id: "career-coach",
    name: "Career Signal",
    role: "Resume/Career Coach",
    taskType: "career",
    skills: ["resume rewrite", "interview prep", "career positioning"],
    promise: "Turns experience into sharper resumes, interview answers, and positioning.",
    examples: ["Improve resume", "Prep interview", "Write LinkedIn summary"],
    onchainMatch: ["content", "strategy"],
    category: "Work",
    defaultTask: "Improve my resume summary for a web3 engineering role.",
    defaultConstraints: "Make it specific, credible, and achievement-oriented."
  },
  {
    id: "meeting-summarizer",
    name: "Brief Engine",
    role: "Meeting Summarizer",
    taskType: "meeting",
    skills: ["summaries", "action items", "decision logs"],
    promise: "Converts messy notes into decisions, owners, and next steps.",
    examples: ["Summarize meeting", "Extract action items", "Create decision log"],
    onchainMatch: ["content", "operations"],
    category: "Work",
    defaultTask: "Summarize meeting notes into decisions and action items.",
    defaultConstraints: "Return owners, deadlines, unresolved questions, and a concise executive summary."
  },
  {
    id: "productivity-planner",
    name: "Day Architect",
    role: "Productivity Planner",
    taskType: "productivity",
    skills: ["planning", "prioritization", "habit systems"],
    promise: "Turns goals into a realistic daily or weekly operating plan.",
    examples: ["Plan my week", "Prioritize tasks", "Build habit system"],
    onchainMatch: ["planning", "operations"],
    category: "Life",
    defaultTask: "Plan a focused workday for a founder with too many tasks.",
    defaultConstraints: "Include priority order, time blocks, tradeoffs, and what to ignore."
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
