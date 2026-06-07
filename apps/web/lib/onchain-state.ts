export type ActivityItem = {
  id: string;
  contract: string;
  contractAddress: string;
  eventName: string;
  title: string;
  args: Record<string, unknown>;
  value?: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: number;
};

export type ActivityResponse = {
  ok: boolean;
  blockNumber?: string;
  count?: number;
  activity: ActivityItem[];
  error?: string;
};

export type AgentState = {
  id: string;
  name: string;
  wallet: string;
  owner: string;
  skills: string[];
  metadataURI: string;
  tx: string;
  blockNumber: string;
};

export type OrganizationState = {
  id: string;
  name: string;
  owner: string;
  metadataURI: string;
  members: Array<{ agentId: string; role: string }>;
  tx: string;
};

export type TaskState = {
  id: string;
  title: string;
  creator?: string;
  providerAgentId?: string;
  budget?: string;
  price?: string;
  status: "posted" | "proposed" | "hired" | "completed";
  metadataURI?: string;
  termsURI?: string;
  tx: string;
};

export type EconomyState = {
  agents: AgentState[];
  organizations: OrganizationState[];
  tasks: TaskState[];
  world: ActivityItem[];
  payments: ActivityItem[];
  reputation: ActivityItem[];
  governance: ActivityItem[];
  partnerships: ActivityItem[];
};

export function labelFromUri(uri?: string) {
  if (!uri) return "Unlabeled onchain record";
  const tail = uri.split("/").filter(Boolean).pop() ?? uri;
  return tail.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildEconomyState(activity: ActivityItem[]): EconomyState {
  const agents = new Map<string, AgentState>();
  const organizations = new Map<string, OrganizationState>();
  const tasks = new Map<string, TaskState>();

  for (const item of [...activity].reverse()) {
    if (item.eventName === "AgentCreated") {
      const id = String(item.args.agentId);
      const metadataURI = String(item.args.metadataURI ?? "");
      agents.set(id, {
        id,
        name: labelFromUri(metadataURI),
        wallet: String(item.args.wallet ?? ""),
        owner: String(item.args.owner ?? ""),
        skills: String(item.args.skills ?? "").split(",").map((skill) => skill.trim()).filter(Boolean),
        metadataURI,
        tx: item.transactionHash,
        blockNumber: item.blockNumber
      });
    }

    if (item.eventName === "OrganizationCreated") {
      const id = String(item.args.organizationId);
      const metadataURI = String(item.args.metadataURI ?? "");
      organizations.set(id, {
        id,
        name: labelFromUri(metadataURI),
        owner: String(item.args.owner ?? ""),
        metadataURI,
        members: organizations.get(id)?.members ?? [],
        tx: item.transactionHash
      });
    }

    if (item.eventName === "OrganizationMemberSet") {
      const id = String(item.args.organizationId);
      const current = organizations.get(id) ?? {
        id,
        name: `Organization ${id}`,
        owner: "",
        metadataURI: "",
        members: [],
        tx: item.transactionHash
      };
      current.members = [...current.members.filter((member) => member.agentId !== String(item.args.agentId)), { agentId: String(item.args.agentId), role: String(item.args.role ?? "Member") }];
      organizations.set(id, current);
    }

    if (item.eventName === "TaskPosted") {
      const id = String(item.args.taskId);
      const metadataURI = String(item.args.metadataURI ?? "");
      tasks.set(id, {
        id,
        title: labelFromUri(metadataURI),
        creator: String(item.args.creator ?? ""),
        budget: item.value,
        status: "posted",
        metadataURI,
        tx: item.transactionHash
      });
    }

    if (item.eventName === "ProposalSubmitted") {
      const id = String(item.args.taskId);
      const current = tasks.get(id) ?? { id, title: `Task ${id}`, status: "posted", tx: item.transactionHash };
      tasks.set(id, { ...current, providerAgentId: String(item.args.providerAgentId ?? ""), price: item.value, termsURI: String(item.args.termsURI ?? ""), status: "proposed", tx: item.transactionHash });
    }

    if (item.eventName === "AgentHired") {
      const id = String(item.args.taskId);
      const current = tasks.get(id) ?? { id, title: `Task ${id}`, status: "posted", tx: item.transactionHash };
      tasks.set(id, { ...current, providerAgentId: String(item.args.providerAgentId ?? ""), price: item.value, status: "hired", tx: item.transactionHash });
    }

    if (item.eventName === "TaskCompleted") {
      const id = String(item.args.taskId);
      const current = tasks.get(id) ?? { id, title: `Task ${id}`, status: "posted", tx: item.transactionHash };
      tasks.set(id, { ...current, providerAgentId: String(item.args.providerAgentId ?? current.providerAgentId ?? ""), status: "completed", tx: item.transactionHash });
    }
  }

  return {
    agents: [...agents.values()].sort((a, b) => Number(b.id) - Number(a.id)),
    organizations: [...organizations.values()].sort((a, b) => Number(b.id) - Number(a.id)),
    tasks: [...tasks.values()].sort((a, b) => Number(b.id) - Number(a.id)),
    world: activity.filter((item) => item.contract === "WorldEventRegistry"),
    payments: activity.filter((item) => ["Escrow", "Treasury", "SubscriptionManager"].includes(item.contract)),
    reputation: activity.filter((item) => item.contract === "Reputation"),
    governance: activity.filter((item) => item.contract === "Governance"),
    partnerships: activity.filter((item) => item.contract === "PartnershipRegistry")
  };
}

export function summarizeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();
  if (message.includes("user rejected") || message.includes("rejected") || message.includes("denied")) return "You rejected the wallet request. No STT was spent. Click Run agent again when you are ready to sign.";
  if (message.includes("stuck in mempool")) return "Transaction stuck because gas was too low. Open your wallet, find the pending tx, and tap Speed Up. The request will resume automatically — do not re-sign or you will be charged the protocol fee again.";
  if (message.includes("replacement transaction underpriced") || message.includes("transaction underpriced")) return "Gas price was too low. Use the suggested gas in your wallet (or raise it) and retry.";
  if (message.includes("intrinsic gas too low") || message.includes("gas required exceeds")) return "Gas limit was too low. Use the suggested gas — do not lower it in your wallet.";
  if (message.includes("nonce too low")) return "You have a pending transaction in your wallet. Open it, Speed Up or Cancel, then retry.";
  if (message.includes("insufficient funds")) return "Insufficient STT. Fund your Somnia Shannon wallet, then retry the agent request.";
  if (message.includes("underfunded")) return "The Somnia Agent deposit was underfunded. Refresh the page to get a fresh quote, then retry.";
  if (message.includes("transaction reverted") || message.includes("execution reverted")) return "The onchain transaction reverted. Check your STT balance, refresh the deposit quote, and retry.";
  if (message.includes("timeout") || message.includes("timed out")) return "Somnia did not return in time. Your request may still be running onchain; refresh the Workbench to continue checking.";
  if (message.includes("failed to fetch") || message.includes("fetch failed") || message.includes("networkerror")) return "Network connection failed. Check your internet connection and retry.";
  if (message.includes("rpc") || message.includes("rate limit")) return "Somnia RPC is busy right now. Wait a moment, then retry or refresh.";
  if (message.includes("wallet is locked") || message.includes("unauthorized")) return "Your wallet is locked or not authorized. Unlock it, connect this site, then retry.";
  if (message.includes("invalid url") || message.includes("url")) return "Invalid website URL. Use a full https:// or http:// URL, or leave the URL field empty for normal LLM mode.";
  if (message.includes("task too large")) return "The task is too long. Shorten it and retry.";
  if (message.includes("constraints too large")) return "The constraints are too long. Shorten them and retry.";
  if (message.includes("too many urls")) return "Use at most 3 URLs. The current router sends the first URL to Somnia's website parser.";
  if (message.includes("callback") || message.includes("usable result")) return "The agent request was submitted, but Somnia did not return a usable result yet. Check Anchored Results or refresh later.";
  if (message.includes("invalid address")) return "Invalid address. Paste a valid 0x wallet or contract address.";
  if (message.includes("cannot convert") || message.includes("bigint")) return "Invalid number or ID. Use whole-number IDs and valid STT amounts.";
  if (message.includes("chain") || message.includes("network")) return "Wrong network. Switch your wallet to Somnia Shannon and retry.";
  if (message.includes("no injected wallet")) return "No injected wallet found. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet.";
  return raw.slice(0, 320);
}
