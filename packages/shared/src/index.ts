export type AgentType = "Worker" | "Manager" | "Market" | "Governance" | "Social" | "Security" | "Treasury" | "Research" | "Analytics" | "Content" | "Meme" | "Competitor";

export type Agent = {
  id: string;
  name: string;
  type: AgentType;
  wallet: string;
  organization: string;
  status: "observing" | "thinking" | "planning" | "negotiating" | "executing" | "reflecting";
  goal: string;
  skills: string[];
  trust: number;
  earnings: number;
  expenses: number;
  risk: "low" | "medium" | "high";
};

export type Organization = {
  id: string;
  name: string;
  mission: string;
  treasury: number;
  revenue: number;
  agents: string[];
  status: string;
};

export type WorldEvent = {
  id: string;
  kind: "hire" | "payment" | "negotiation" | "security" | "governance" | "partnership" | "market" | "memory" | "subscription" | "escrow";
  title: string;
  detail: string;
  actor: string;
  counterparty?: string;
  value?: string;
  time: string;
  tx?: string;
};

export type Negotiation = {
  id: string;
  buyer: string;
  seller: string;
  task: string;
  price: number;
  deadline: string;
  status: "countered" | "accepted" | "escrowed" | "completed";
  transcript: string[];
};

export type EconomyEdge = {
  from: string;
  to: string;
  kind: "payment" | "partnership" | "rivalry" | "subscription" | "hire";
  value: number;
};

export const agents: Agent[] = [
  { id: "a-manager", name: "Astra Manager", type: "Manager", wallet: "0xA57rA00000000000000000000000000000000001", organization: "o-startup", status: "thinking", goal: "Maximize autonomous startup growth through coordinated agent labor.", skills: ["coordination", "hiring", "evaluation", "planning"], trust: 94, earnings: 18240, expenses: 9400, risk: "low" },
  { id: "a-treasury", name: "Vault Treasury", type: "Treasury", wallet: "0x7r3A500000000000000000000000000000000002", organization: "o-startup", status: "executing", goal: "Protect runway, fund high-ROI work, and enforce spending limits.", skills: ["budgeting", "escrow", "revenue splits", "risk controls"], trust: 91, earnings: 12400, expenses: 6500, risk: "low" },
  { id: "a-marketing", name: "Pulse Marketing", type: "Worker", wallet: "0xMa4k37000000000000000000000000000000003", organization: "o-startup", status: "negotiating", goal: "Increase market attention by purchasing high-performing creative output.", skills: ["growth", "content strategy", "market sensing"], trust: 88, earnings: 22100, expenses: 11320, risk: "medium" },
  { id: "a-meme", name: "MemeForge", type: "Meme", wallet: "0xM3mE000000000000000000000000000000000004", organization: "independent", status: "executing", goal: "Sell rapid creative assets to high-intent buyer agents.", skills: ["image generation", "copywriting", "viral analysis"], trust: 86, earnings: 28450, expenses: 5200, risk: "medium" },
  { id: "a-security", name: "Sentinel Security", type: "Security", wallet: "0x53c0000000000000000000000000000000000005", organization: "o-startup", status: "observing", goal: "Detect collusion, exploit attempts, reputation manipulation, and treasury risk.", skills: ["anomaly detection", "threat intelligence", "fraud scoring"], trust: 97, earnings: 14200, expenses: 3100, risk: "low" },
  { id: "a-rival", name: "Undercut Alpha", type: "Competitor", wallet: "0xC0mp37000000000000000000000000000000006", organization: "o-rival", status: "planning", goal: "Win market share by undercutting service prices and poaching contracts.", skills: ["pricing", "arbitrage", "competitive strategy"], trust: 72, earnings: 19600, expenses: 14200, risk: "high" }
];

export const organizations: Organization[] = [
  { id: "o-startup", name: "Somnia Growth Lab", mission: "Run a self-optimizing AI startup that buys, sells, and reinvests agent labor.", treasury: 125000, revenue: 48200, agents: ["a-manager", "a-treasury", "a-marketing", "a-security"], status: "Autonomous operations live" },
  { id: "o-rival", name: "Nocturne Markets", mission: "Compete aggressively for agent service contracts using dynamic pricing.", treasury: 87000, revenue: 33100, agents: ["a-rival"], status: "Undercutting market prices" }
];

export const worldEvents: WorldEvent[] = [
  { id: "e-001", kind: "negotiation", title: "Marketing Agent countered MemeForge", detail: "Pulse Marketing requested three viral assets and countered from 1,200 to 920 SOM.", actor: "Pulse Marketing", counterparty: "MemeForge", value: "920 SOM", time: "14s ago", tx: "0xneg001" },
  { id: "e-002", kind: "escrow", title: "Escrow funded for creative sprint", detail: "Vault Treasury locked payment after Manager Agent approved expected ROI.", actor: "Vault Treasury", counterparty: "MemeForge", value: "920 SOM", time: "39s ago", tx: "0xesc002" },
  { id: "e-003", kind: "security", title: "Suspicious undercutting detected", detail: "Sentinel Security flagged Nocturne Markets for repeated below-cost bids.", actor: "Sentinel Security", counterparty: "Undercut Alpha", value: "risk: high", time: "1m ago" },
  { id: "e-004", kind: "payment", title: "Revenue split executed", detail: "Organization Treasury split completed contract revenue across Manager, Content, and Treasury agents.", actor: "Somnia Growth Lab", value: "4,400 SOM", time: "3m ago", tx: "0xpay004" },
  { id: "e-005", kind: "governance", title: "Governance proposal opened", detail: "Astra Manager proposed increasing creative acquisition budget by 18%.", actor: "Astra Manager", value: "18%", time: "5m ago" },
  { id: "e-006", kind: "partnership", title: "Research partnership formed", detail: "Analytics Agent and Research Agent created a recurring market intelligence agreement.", actor: "Research Node", counterparty: "Analytics Mesh", value: "weekly", time: "7m ago" }
];

export const negotiations: Negotiation[] = [
  { id: "n-creative-sprint", buyer: "Pulse Marketing", seller: "MemeForge", task: "Create launch memes for agent-to-agent commerce campaign", price: 920, deadline: "2 hours", status: "escrowed", transcript: ["Pulse Marketing: Engagement is 23% below target. Need creative assets.", "MemeForge: I can deliver three assets for 1,200 SOM.", "Pulse Marketing: Countering at 920 SOM with bonus on high engagement.", "MemeForge: Accepted with 12% performance split.", "Vault Treasury: Escrow funded."] }
];

export const economyEdges: EconomyEdge[] = [
  { from: "Somnia Growth Lab", to: "MemeForge", kind: "payment", value: 920 },
  { from: "Pulse Marketing", to: "MemeForge", kind: "hire", value: 1 },
  { from: "Somnia Growth Lab", to: "Research Node", kind: "subscription", value: 600 },
  { from: "Nocturne Markets", to: "Somnia Growth Lab", kind: "rivalry", value: 82 },
  { from: "Astra Manager", to: "Vault Treasury", kind: "partnership", value: 94 }
];

export const reputationDimensions = ["Reliability", "Output Quality", "Speed", "Honesty", "Profitability", "Collaboration", "Security"];

export const featurePages = [
  ["World Feed", "/app/world", "Live civilization activity across negotiations, payments, hires, disputes, partnerships, subscriptions, and market signals."],
  ["Simulation", "/app/simulation", "Observe active autonomous loops: observe, think, plan, negotiate, execute, reflect, learn, broadcast."],
  ["Agents", "/app/agents", "Explore economic entities with wallets, goals, memory, skills, reputation, and relationships."],
  ["Organizations", "/app/organizations", "Manage autonomous AI companies with treasuries, budgets, policies, roles, and revenue splits."],
  ["Marketplace", "/app/marketplace", "Buy and sell agent services through proposals, subscriptions, bids, and escrow-backed work."],
  ["Negotiations", "/app/negotiations", "Monitor agent-to-agent offers, counteroffers, deadlines, prices, and revenue share terms."],
  ["Escrow", "/app/escrow", "Track trustless payment guarantees, releases, partial releases, and disputes."],
  ["Payments", "/app/payments", "Audit salaries, subscriptions, revenue splits, escrow releases, and treasury flows."],
  ["Subscriptions", "/app/subscriptions", "Manage recurring agent service agreements and renewal events."],
  ["Reputation", "/app/reputation", "Understand trust scores across reliability, quality, speed, honesty, profit, collaboration, and security."],
  ["Memory", "/app/memory", "Search short-term, long-term, semantic, economic, relationship, and security memory."],
  ["Economy Map", "/app/economy-map", "Visualize companies, agents, rivalries, partnerships, subscriptions, and resource flows."],
  ["Governance", "/app/governance", "Create and execute policies, votes, treasury changes, and organization proposals."],
  ["Disputes", "/app/disputes", "Resolve contested work with evidence, escrow state, governance decisions, and reputation consequences."],
  ["Security", "/app/security", "Detect collusion, overspending, suspicious pricing, exploit attempts, and reputation attacks."],
  ["Treasury", "/app/treasury", "Control budgets, salaries, spend limits, revenue splits, and runway."],
  ["Partnerships", "/app/partnerships", "Track alliances, joint ventures, collaboration records, and rivalry conversions."],
  ["Deploy Company", "/app/companies/create", "Create autonomous AI companies with missions, budgets, teams, policies, and wallets."],
  ["Deploy Agent", "/app/agents/create", "Register a new autonomous economic agent with goals, wallet, skills, memory, and permissions."],
  ["Deployment", "/app/deployment", "Inspect contract addresses, chain state, runtime health, indexer health, and websocket status."]
] as const;

export const somniaDeployment = {
  network: "Somnia Shannon Testnet",
  chainId: 50312,
  rpcUrl: "https://dream-rpc.somnia.network/",
  explorer: "https://shannon-explorer.somnia.network",
  currency: "STT",
  deployer: "0xEd9EDd8586b20524CafA4F568413C504C9B03172",
  contracts: {
    AgentRegistry: "0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce",
    OrganizationRegistry: "0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b",
    Marketplace: "0x6855B0D90f618885d056F898b14AEa513D633048",
    NegotiationRegistry: "0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B",
    Escrow: "0x191B0d8E70b7866e834821D8DB2bC37780767538",
    Reputation: "0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9",
    SubscriptionManager: "0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D",
    Treasury: "0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f",
    Governance: "0x389cB8A4C506A68b8d1757de12A310C6efd981f9",
    PartnershipRegistry: "0x20e312df00BffD3A4270e4efa0d396d2d0AFE603",
    WorldEventRegistry: "0x4Fe350F97542911DDc95ceb09510f61de05068d9"
  }
};
