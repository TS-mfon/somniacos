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
  | "productivity"
  | "token-launch";

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
  missionId?: string;
  outputFormat?: OutputFormat;
  nextActions?: AgentNextAction[];
  handoffs?: AgentHandoff[];
  memorySnapshot?: string;
  createdAt: string;
  completedAt: string;
  txHash?: string;
  processId?: string;
  stepId?: string;
  missionRunId?: string;
  stepIndex?: number;
  stepLabel?: string;
  parentRequestId?: string;
  confidence?: AgentConfidence;
  artifact?: AgentArtifact;
};

export type OutputFormat = "auto" | "x-post" | "thread" | "brief" | "audit" | "checklist" | "email" | "plan";

export type AgentMission = {
  id: string;
  label: string;
  description: string;
  agentId: string;
  task: string;
  constraints: string;
  outputFormat: OutputFormat;
  steps?: AgentMissionStep[];
};

export type AgentMissionStep = {
  label: string;
  agentId: string;
  task: string;
  constraints: string;
  outputFormat: OutputFormat;
  requiresAgentRun: boolean;
  requiresWalletAction?: "token-deploy";
  usesPreviousOutput?: boolean;
};

export type AgentMemory = {
  projectName: string;
  audience: string;
  industry?: string;
  tone?: string;
  riskTolerance?: string;
  walletExperience?: string;
  outputLength?: string;
  commonLinks?: string;
  doNotDo?: string;
  context: string;
  preferences: string;
  lastUpdated: string;
};

export type AgentConfidence = {
  score: number;
  label: "Low" | "Medium" | "High";
  reasons: string[];
  dimensions?: Array<{ label: string; score: number; reason: string }>;
};

export type AgentNextAction = {
  label: string;
  agentId: string;
  task: string;
  constraints: string;
  outputFormat: OutputFormat;
};

export type AgentHandoff = {
  agentId: string;
  reason: string;
  task: string;
  requiresSignature?: boolean;
  usesPreviousOutput?: boolean;
};

export type AgentArtifact =
  | {
      type: "token";
      tokenAddress: string;
      name: string;
      symbol: string;
      decimals: number;
      initialSupply: string;
      owner: string;
      deployer: string;
      metadataURI: string;
      txHash: string;
    }
  | {
      type: "receipt";
      receiptId: string;
      resultHash: string;
    };

export type AgentProofReceipt = {
  receiptId: string;
  requestId?: string;
  processId?: string;
  stepId?: string;
  missionRunId?: string;
  agentId: string;
  actionType: "agent.run" | "token.launch" | "mission.step";
  source: AgentRunRecord["source"] | "TokenFactory";
  txHash?: string;
  resultHash?: string;
  tokenAddress?: string;
  feePaid?: string;
  chainId: 50312;
  createdAt: string;
};

export type MissionReceipt = {
  receiptId: string;
  missionId: string;
  missionLabel: string;
  user: string;
  chainId: 50312;
  agentChain: Array<{ label: string; agentId: string; walletAction?: string }>;
  stepOutputs: Array<{ label: string; agentId: string; result: string; txHash?: string }>;
  txHashes: string[];
  tokenAddress?: string;
  resultHash?: string;
  feePaid?: string;
  createdAt: string;
};

export type CompareSession = {
  id: string;
  task: string;
  constraints: string;
  outputFormat: OutputFormat;
  agentIds: string[];
  results: AgentRunRecord[];
  createdAt: string;
};

export const curatedAgents: CuratedAgent[] = [
  {
    id: "token-launcher",
    name: "Mint Architect",
    role: "Token Launch Agent",
    taskType: "token-launch",
    skills: ["token deployment", "parameter review", "launch proof"],
    promise: "Prepares non-custodial token launches, explains the signing action, and records token details after deployment.",
    examples: ["Launch testnet token", "Review token params", "Generate token launch summary"],
    onchainMatch: ["token", "deploy", "launch"],
    category: "Crypto",
    defaultTask: "Prepare a fixed-supply testnet token launch on Somnia.",
    defaultConstraints: "Never ask for a private key. Validate token name, symbol, supply, owner, and explain the wallet transaction."
  },
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

export const regularWorkbenchAgents = curatedAgents.filter((agent) => agent.id !== "token-launcher");

export const outputFormats: Array<{ id: OutputFormat; label: string; description: string }> = [
  { id: "auto", label: "Auto", description: "Let the agent choose the best structure." },
  { id: "x-post", label: "X post", description: "Short publishable social output." },
  { id: "thread", label: "Thread", description: "Multi-post sequence with hooks." },
  { id: "brief", label: "Brief", description: "Findings, risks, and recommendation." },
  { id: "audit", label: "Audit", description: "Issues, severity, evidence, and fixes." },
  { id: "checklist", label: "Checklist", description: "Actionable steps a user can follow." },
  { id: "email", label: "Email", description: "Subject and concise body copy." },
  { id: "plan", label: "Plan", description: "Phased execution with next steps." }
];

export const agentMissions: AgentMission[] = [
  {
    id: "launch-token",
    label: "Launch Token",
    description: "Plan, review, deploy, and package a non-custodial Somnia testnet token launch.",
    agentId: "token-launcher",
    task: "Prepare a fixed-supply testnet token launch on Somnia.",
    constraints: "Do not ask for private keys. Explain token parameters, deployment risks, wallet signature, and post-deploy next steps.",
    outputFormat: "checklist",
    steps: [
      {
        label: "Plan token",
        agentId: "token-launcher",
        task: "Review and prepare the token launch parameters.",
        constraints: "Validate name, symbol, decimals, supply, owner, and metadata. Do not ask for a private key.",
        outputFormat: "checklist",
        requiresAgentRun: true
      },
      {
        label: "Review tokenomics",
        agentId: "token-researcher",
        task: "Review tokenomics and launch risks for the planned token.",
        constraints: "No financial advice. Explain supply, positioning, risks, and unknowns.",
        outputFormat: "brief",
        requiresAgentRun: true,
        usesPreviousOutput: true
      },
      {
        label: "Deploy token",
        agentId: "token-launcher",
        task: "Deploy the fixed-supply token through the SomniacOS token factory.",
        constraints: "Use the connected wallet only. Show token details after receipt confirmation.",
        outputFormat: "checklist",
        requiresAgentRun: false,
        requiresWalletAction: "token-deploy",
        usesPreviousOutput: true
      },
      {
        label: "Write launch copy",
        agentId: "content-writer",
        task: "Write launch copy for the deployed Somnia testnet token.",
        constraints: "Use deployed token details and keep claims factual.",
        outputFormat: "x-post",
        requiresAgentRun: true,
        usesPreviousOutput: true
      }
    ]
  },
  {
    id: "crypto-founder-launch",
    label: "Launch my crypto project",
    description: "Marketing strategy, content direction, and practical launch next steps.",
    agentId: "marketing-strategist",
    task: "Create a seven-day launch mission for my crypto product.",
    constraints: "Use my saved memory if available. Include positioning, audience, launch channels, content calendar, risks, and next agent handoffs.",
    outputFormat: "plan",
    steps: [
      {
        label: "Strategy",
        agentId: "marketing-strategist",
        task: "Create a seven-day launch mission for my crypto product.",
        constraints: "Include positioning, channels, content calendar, risks, and next agent handoffs.",
        outputFormat: "plan",
        requiresAgentRun: true
      },
      {
        label: "Research",
        agentId: "research-analyst",
        task: "Validate the launch strategy with market and competitor assumptions.",
        constraints: "Separate facts, assumptions, risks, and what to verify next.",
        outputFormat: "brief",
        requiresAgentRun: true,
        usesPreviousOutput: true
      },
      {
        label: "Content",
        agentId: "content-writer",
        task: "Turn the launch strategy and research into publishable X content.",
        constraints: "Keep the content concise and ready to publish.",
        outputFormat: "thread",
        requiresAgentRun: true,
        usesPreviousOutput: true
      }
    ]
  },
  {
    id: "token-due-diligence",
    label: "Research a token or protocol",
    description: "Balanced research with utility, risks, catalysts, and unknowns.",
    agentId: "token-researcher",
    task: "Research this token or protocol and explain whether it deserves deeper review.",
    constraints: "No financial advice. Separate facts, assumptions, risks, catalysts, and what to verify next.",
    outputFormat: "brief"
  },
  {
    id: "builder-audit",
    label: "Audit my code or contract",
    description: "Security-minded review with concrete fixes and missing tests.",
    agentId: "code-auditor",
    task: "Audit this code or smart contract snippet for bugs, security risks, and missing tests.",
    constraints: "Prioritize exploitable issues, runtime failures, severity, proof, and actionable fixes.",
    outputFormat: "audit"
  },
  {
    id: "daily-operator",
    label: "Plan my day",
    description: "Turns messy goals into a realistic work plan.",
    agentId: "productivity-planner",
    task: "Plan a focused workday from my current goals and constraints.",
    constraints: "Include priority order, time blocks, what to ignore, and a final checklist.",
    outputFormat: "checklist"
  },
  {
    id: "wallet-safety",
    label: "Check wallet or dApp risk",
    description: "Plain-English safety review before interacting with a wallet, contract, or dApp.",
    agentId: "wallet-risk-scanner",
    task: "Create a safety review for this wallet, transaction, or dApp interaction.",
    constraints: "Make it understandable for a non-technical user. Include red flags, safe actions, and what not to sign.",
    outputFormat: "checklist"
  },
  {
    id: "compare-products",
    label: "Compare two products",
    description: "Research-led comparison for crypto tools, SaaS products, or everyday buying decisions.",
    agentId: "research-analyst",
    task: "Compare two products, protocols, or tools and recommend which one fits the stated use case.",
    constraints: "Separate facts, assumptions, tradeoffs, risks, and the final recommendation. Do not invent unavailable specs.",
    outputFormat: "brief",
    steps: [
      {
        label: "Research comparison",
        agentId: "research-analyst",
        task: "Compare the supplied products or tools against the user's stated use case.",
        constraints: "Use supplied links when available. Separate confirmed facts from assumptions.",
        outputFormat: "brief",
        requiresAgentRun: true
      },
      {
        label: "Decision brief",
        agentId: "productivity-planner",
        task: "Turn the research comparison into a simple decision brief.",
        constraints: "Give the user a clear recommendation, rejection criteria, and next step.",
        outputFormat: "checklist",
        requiresAgentRun: true,
        usesPreviousOutput: true
      }
    ]
  },
  {
    id: "dao-proposal",
    label: "Draft DAO proposal",
    description: "Governance proposal with rationale, execution steps, budget, and voting risks.",
    agentId: "governance-drafter",
    task: "Draft a DAO governance proposal from this goal.",
    constraints: "Include title, summary, motivation, specification, budget, risks, success metrics, and voting guidance.",
    outputFormat: "plan",
    steps: [
      {
        label: "Proposal draft",
        agentId: "governance-drafter",
        task: "Draft the DAO governance proposal.",
        constraints: "Use clear governance language and include implementation details.",
        outputFormat: "plan",
        requiresAgentRun: true
      },
      {
        label: "Treasury review",
        agentId: "treasury-planner",
        task: "Review the proposal budget and treasury impact.",
        constraints: "Flag budget risks, sustainability concerns, and missing assumptions.",
        outputFormat: "brief",
        requiresAgentRun: true,
        usesPreviousOutput: true
      }
    ]
  },
  {
    id: "transaction-explainer",
    label: "Explain transaction",
    description: "Plain-English transaction review before a user signs.",
    agentId: "transaction-explainer",
    task: "Explain what this transaction or contract interaction appears to do.",
    constraints: "Explain likely action, permissions, value movement, red flags, and what the user should verify before signing.",
    outputFormat: "checklist"
  },
  {
    id: "defi-risk-review",
    label: "Review DeFi yield",
    description: "Risk-first review of a pool, vault, farm, bridge, or strategy.",
    agentId: "defi-yield-scout",
    task: "Review this DeFi yield opportunity for risks and operational requirements.",
    constraints: "No financial advice. Cover smart contract risk, liquidity, emissions, lockups, impermanent loss, bridge risk, and what to verify.",
    outputFormat: "brief"
  },
  {
    id: "community-launch",
    label: "Launch community campaign",
    description: "Create a coordinated campaign plan and publishable community content.",
    agentId: "marketing-strategist",
    task: "Plan a community campaign for a product launch.",
    constraints: "Include campaign objective, channels, posting cadence, incentives, moderation risks, and content examples.",
    outputFormat: "plan",
    steps: [
      {
        label: "Campaign plan",
        agentId: "marketing-strategist",
        task: "Create the community campaign plan.",
        constraints: "Prioritize practical channels, timing, and measurable outcomes.",
        outputFormat: "plan",
        requiresAgentRun: true
      },
      {
        label: "Content pack",
        agentId: "content-writer",
        task: "Create publishable campaign content from the approved plan.",
        constraints: "Include X posts, Discord announcement copy, and a short launch CTA.",
        outputFormat: "thread",
        requiresAgentRun: true,
        usesPreviousOutput: true
      }
    ]
  },
  {
    id: "meeting-to-actions",
    label: "Turn meeting into actions",
    description: "Converts messy notes into owners, deadlines, risks, and next steps.",
    agentId: "meeting-summarizer",
    task: "Turn these meeting notes into a clean action plan.",
    constraints: "Include decisions, open questions, owners, deadlines, risks, and follow-up message.",
    outputFormat: "checklist"
  },
  {
    id: "resume-review",
    label: "Review resume",
    description: "Career agent review for clarity, positioning, and application fit.",
    agentId: "career-coach",
    task: "Review this resume or profile for a target role.",
    constraints: "Give concrete edits, missing proof points, weak claims, and a stronger summary.",
    outputFormat: "brief"
  },
  {
    id: "travel-plan",
    label: "Plan trip",
    description: "Everyday travel planning with budget, itinerary, and risk notes.",
    agentId: "travel-planner",
    task: "Create a practical travel plan for this destination and trip style.",
    constraints: "Include itinerary, budget assumptions, logistics, safety notes, and what to book first.",
    outputFormat: "plan"
  },
  {
    id: "study-plan",
    label: "Create study plan",
    description: "Learning plan with schedule, resources, practice tasks, and checkpoints.",
    agentId: "study-tutor",
    task: "Create a study plan for this topic and timeline.",
    constraints: "Include daily schedule, milestones, practice tasks, checkpoint tests, and what to skip.",
    outputFormat: "plan"
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

export function findAgent(agentId: string) {
  return curatedAgents.find((agent) => agent.id === agentId);
}

export function missionsForAgent(agentId: string) {
  return agentMissions.filter((mission) => mission.agentId === agentId || mission.steps?.some((step) => step.agentId === agentId));
}

export function defaultMemory(): AgentMemory {
  return {
    projectName: "",
    audience: "",
    industry: "",
    tone: "",
    riskTolerance: "",
    walletExperience: "",
    outputLength: "",
    commonLinks: "",
    doNotDo: "",
    context: "",
    preferences: "",
    lastUpdated: ""
  };
}

export function createProofReceipt(run: AgentRunRecord, actionType: AgentProofReceipt["actionType"] = run.artifact?.type === "token" ? "token.launch" : run.stepIndex !== undefined ? "mission.step" : "agent.run"): AgentProofReceipt {
  return {
    receiptId: `${actionType}:${run.requestId || run.artifact?.type || run.txHash || Date.now()}`,
    requestId: run.requestId,
    processId: run.processId,
    stepId: run.stepId,
    missionRunId: run.missionRunId,
    agentId: run.appAgentId,
    actionType,
    source: run.artifact?.type === "token" ? "TokenFactory" : run.source ?? "Somnia",
    txHash: run.txHash,
    resultHash: run.result ? `local:${run.result.length}:${run.result.slice(0, 24)}` : undefined,
    tokenAddress: run.artifact?.type === "token" ? run.artifact.tokenAddress : undefined,
    feePaid: undefined,
    chainId: 50312,
    createdAt: run.completedAt || run.createdAt || new Date().toISOString()
  };
}

export function memoryToPrompt(memory?: AgentMemory) {
  if (!memory) return "";
  const lines = [
    memory.projectName ? `Project: ${memory.projectName}` : "",
    memory.audience ? `Audience: ${memory.audience}` : "",
    memory.industry ? `Industry: ${memory.industry}` : "",
    memory.tone ? `Tone: ${memory.tone}` : "",
    memory.riskTolerance ? `Risk tolerance: ${memory.riskTolerance}` : "",
    memory.walletExperience ? `Wallet experience: ${memory.walletExperience}` : "",
    memory.outputLength ? `Preferred output length: ${memory.outputLength}` : "",
    memory.commonLinks ? `Common links: ${memory.commonLinks}` : "",
    memory.doNotDo ? `Do not do: ${memory.doNotDo}` : "",
    memory.context ? `Context: ${memory.context}` : "",
    memory.preferences ? `Preferences: ${memory.preferences}` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

export function scoreAgentRun(run: Pick<AgentRunRecord, "appAgentId" | "task" | "constraints" | "url" | "result" | "source" | "outputFormat" | "status">): AgentConfidence {
  if (run.status !== "Success" || !run.result.trim()) {
    return {
      score: 20,
      label: "Low",
      reasons: ["The agent did not return a completed usable result."],
      dimensions: [
        { label: "Completion", score: 20, reason: "The run did not complete successfully." },
        { label: "Live source", score: run.source === "Somnia" || run.source === "LLM API" ? 40 : 10, reason: "The source could not produce a usable result." },
        { label: "Actionability", score: 15, reason: "No completed output is available to act on." }
      ]
    };
  }

  const reasons: string[] = [];
  let score = 35;
  const result = run.result.toLowerCase();
  const agent = findAgent(run.appAgentId);
  const dimensions = [
    {
      label: "Relevance",
      score: run.task.trim().length > 20 ? 78 : 52,
      reason: "Measures whether the task was specific enough to judge the response."
    },
    {
      label: "Constraints",
      score: run.constraints.trim().length > 10 ? 76 : 48,
      reason: "Measures whether the run included constraints that shaped the answer."
    },
    {
      label: "Depth",
      score: run.result.length > 700 ? 86 : run.result.length > 350 ? 72 : 48,
      reason: "Measures whether the output has enough substance for the task."
    },
    {
      label: "Live source",
      score: run.source === "Somnia" ? 92 : run.source === "LLM API" ? 84 : 22,
      reason: "Scores whether the answer came from a live agent source."
    },
    {
      label: "Actionability",
      score: /next|recommend|step|fix|checklist|post|subject|body/i.test(run.result) ? 80 : 58,
      reason: "Measures whether the result gives the user something usable."
    }
  ];

  if (run.task.trim().length > 20) {
    score += 10;
    reasons.push("The task was specific enough for the agent to execute.");
  }
  if (run.constraints.trim().length > 10) {
    score += 10;
    reasons.push("The run included constraints that shaped the output.");
  }
  if (run.result.length > 350) {
    score += 12;
    reasons.push("The output has enough detail to be useful.");
  }
  if (run.url) {
    score += 8;
    reasons.push("The run included a source URL for website-aware context.");
  }
  if (run.source === "LLM API" || run.source === "Somnia") {
    score += 10;
    reasons.push(`The output came from ${run.source}.`);
  }
  if (agent && run.task.toLowerCase().includes(agent.taskType.split("-")[0])) {
    score += 5;
    reasons.push("The selected agent matches the requested task area.");
  }
  if (run.outputFormat && result.includes(run.outputFormat === "x-post" ? "post" : run.outputFormat)) {
    score += 5;
    reasons.push("The output appears aligned with the selected result format.");
  }
  if (result.includes("fallback") || result.includes("failed") || result.includes("unavailable")) {
    score -= 15;
    reasons.push("The output contains fallback or failure language, so confidence is reduced.");
  }

  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    label: bounded >= 75 ? "High" : bounded >= 50 ? "Medium" : "Low",
    reasons: reasons.slice(0, 4),
    dimensions
  };
}

export function inferOutputFormat(agent: CuratedAgent, requested: OutputFormat): OutputFormat {
  if (requested !== "auto") return requested;
  if (agent.taskType === "content") return "x-post";
  if (agent.taskType === "code-audit" || agent.taskType === "security-audit") return "audit";
  if (agent.taskType === "email") return "email";
  if (agent.taskType === "wallet-risk" || agent.taskType === "airdrop") return "checklist";
  if (agent.taskType === "marketing" || agent.taskType === "treasury" || agent.taskType === "productivity" || agent.taskType === "travel") return "plan";
  return "brief";
}

export function buildAgentHandoffs(agentId: string, task: string): AgentHandoff[] {
  const handoffs: Record<string, AgentHandoff[]> = {
    "marketing-strategist": [
      { agentId: "content-writer", reason: "Turn the strategy into publishable posts.", task: `Write launch content based on: ${task}` },
      { agentId: "research-analyst", reason: "Validate market claims and competitors.", task: `Research evidence and competitors for: ${task}` }
    ],
    "research-analyst": [
      { agentId: "content-writer", reason: "Convert findings into a clear public narrative.", task: `Create content from this research: ${task}` },
      { agentId: "security-auditor", reason: "Review risks and weak claims.", task: `Audit the risk assumptions in: ${task}` }
    ],
    "token-researcher": [
      { agentId: "wallet-risk-scanner", reason: "Check interaction and signing risks.", task: `Create wallet safety steps for: ${task}` },
      { agentId: "portfolio-planner", reason: "Translate research into a risk framework.", task: `Create a non-financial risk framework for: ${task}` }
    ],
    "code-auditor": [
      { agentId: "security-auditor", reason: "Escalate security-sensitive findings.", task: `Create an incident-style risk summary for: ${task}` },
      { agentId: "content-writer", reason: "Summarize fixes for a changelog or PR.", task: `Write a concise fix summary for: ${task}` }
    ],
    "wallet-risk-scanner": [
      { agentId: "transaction-explainer", reason: "Explain the transaction in plain English.", task: `Explain this transaction or wallet action: ${task}` },
      { agentId: "security-auditor", reason: "Escalate suspicious patterns.", task: `Classify security severity for: ${task}` }
    ]
  };
  return (handoffs[agentId] ?? [
    { agentId: "research-analyst", reason: "Gather more context before the next run.", task: `Research supporting context for: ${task}` },
    { agentId: "content-writer", reason: "Turn the output into a shareable deliverable.", task: `Create a publishable summary for: ${task}` }
  ]).slice(0, 2);
}

export function buildNextActions(agentId: string, task: string, outputFormat: OutputFormat): AgentNextAction[] {
  const handoffs = buildAgentHandoffs(agentId, task);
  return [
    {
      label: "Improve this result",
      agentId,
      task: `Improve and sharpen this output: ${task}`,
      constraints: "Keep the strongest parts, remove weak claims, and make the output more useful.",
      outputFormat
    },
    ...handoffs.map((handoff) => ({
      label: `Hand off to ${readableAgentLabel(handoff.agentId)}`,
      agentId: handoff.agentId,
      task: handoff.task,
      constraints: handoff.reason,
      outputFormat: "auto" as OutputFormat
    }))
  ].slice(0, 3);
}
