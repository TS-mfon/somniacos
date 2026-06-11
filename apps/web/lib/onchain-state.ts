import { normalizeAppError } from "./app-error";

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
  return normalizeAppError(error).message;
}
