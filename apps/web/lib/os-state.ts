import { formatEther, parseEther } from "viem";
import { osKernelConfigured, osKernelEnabled, osContracts } from "./contracts";
import type { ActivityItem } from "./onchain-state";

export type OSProcessStep = {
  id: string;
  processId: string;
  capabilityId: string;
  appAgentId: string;
  requestId: string;
  mode: string;
  status: "Pending" | "Success" | "Failed" | "TimedOut";
  prompt: string;
  url: string;
  result: string;
  tx: string;
  callbackTx?: string;
  totalCost?: string;
};

export type OSProcess = {
  id: string;
  owner: string;
  policyId: string;
  goal: string;
  status: "Created" | "Running" | "Waiting" | "Completed" | "Failed" | "Cancelled";
  metadataURI: string;
  finalSummary: string;
  resultURI: string;
  tx: string;
  blockNumber: string;
  steps: OSProcessStep[];
  feesPaid: string;
};

export type OSCapability = {
  id: string;
  label: string;
  mode: string;
  somniaAgentId: string;
  schemaURI: string;
  active: boolean;
};

export type OSRevenue = {
  totalFees: string;
  eventCount: number;
  feeAmount: string;
  feeRecipient: string;
  events: ActivityItem[];
};

const processStatuses: Record<string, OSProcess["status"]> = {
  ProcessCreated: "Created",
  ProcessStarted: "Waiting",
  ProcessCompleted: "Completed",
  ProcessFailed: "Failed",
  ProcessCancelled: "Cancelled"
};

const stepStatuses: Record<number, OSProcessStep["status"]> = {
  1: "Pending",
  2: "Success",
  3: "Failed",
  4: "TimedOut"
};

const modeLabels: Record<number, string> = {
  0: "LLM",
  1: "Website",
  2: "JSON"
};

export function osAvailable() {
  return osKernelEnabled && osKernelConfigured;
}

export function buildOSProcesses(activity: ActivityItem[]) {
  const processes = new Map<string, OSProcess>();
  const feesByProcess = new Map<string, bigint>();

  for (const item of [...activity].reverse()) {
    if (item.eventName === "ProtocolFeePaid") {
      const processId = String(item.args.processId ?? "0");
      const amount = BigInt(String(item.args.amount ?? "0"));
      feesByProcess.set(processId, (feesByProcess.get(processId) ?? 0n) + amount);
    }

    if (item.eventName === "ProcessCreated") {
      const id = String(item.args.processId ?? "");
      if (!id) continue;
      processes.set(id, {
        id,
        owner: String(item.args.owner ?? ""),
        policyId: String(item.args.policyId ?? ""),
        goal: String(item.args.goal ?? ""),
        status: "Created",
        metadataURI: String(item.args.metadataURI ?? ""),
        finalSummary: "",
        resultURI: "",
        tx: item.transactionHash,
        blockNumber: item.blockNumber,
        steps: [],
        feesPaid: "0 STT"
      });
    }

    if (processStatuses[item.eventName]) {
      const id = String(item.args.processId ?? "");
      const current = processes.get(id);
      if (current) current.status = processStatuses[item.eventName];
    }

    if (item.eventName === "ProcessStepRequested") {
      const processId = String(item.args.processId ?? "");
      const current = processes.get(processId);
      if (!current) continue;
      const stepId = String(item.args.stepId ?? "");
      current.steps = [...current.steps.filter((step) => step.id !== stepId), {
        id: stepId,
        processId,
        capabilityId: String(item.args.capabilityId ?? ""),
        appAgentId: String(item.args.appAgentId ?? ""),
        requestId: String(item.args.requestId ?? ""),
        mode: modeLabels[Number(item.args.mode ?? 0)] ?? "LLM",
        status: "Pending",
        prompt: String(item.args.prompt ?? ""),
        url: String(item.args.url ?? ""),
        result: "",
        tx: item.transactionHash,
        totalCost: `${Number(formatEther(BigInt(String(item.args.totalCost ?? "0")))).toFixed(4)} STT`
      }];
    }

    if (item.eventName === "ProcessStepCompleted" || item.eventName === "OSAgentRunCompleted") {
      const processId = String(item.args.processId ?? "");
      const current = processes.get(processId);
      if (!current) continue;
      const stepId = String(item.args.stepId ?? "");
      current.steps = current.steps.map((step) => step.id === stepId ? {
        ...step,
        status: stepStatuses[Number(item.args.status ?? 0)] ?? "Failed",
        result: String(item.args.result ?? ""),
        callbackTx: item.transactionHash
      } : step);
    }

    if (item.eventName === "ProcessCompleted") {
      const id = String(item.args.processId ?? "");
      const current = processes.get(id);
      if (current) {
        current.finalSummary = String(item.args.finalSummary ?? "");
        current.resultURI = String(item.args.resultURI ?? "");
      }
    }
  }

  for (const [id, process] of processes) {
    process.steps.sort((a, b) => Number(a.id) - Number(b.id));
    process.feesPaid = `${Number(formatEther(feesByProcess.get(id) ?? 0n)).toFixed(4)} STT`;
  }

  return [...processes.values()].sort((a, b) => Number(b.id) - Number(a.id));
}

export function buildOSCapabilities(activity: ActivityItem[]) {
  const capabilities = new Map<string, OSCapability>();
  for (const item of activity) {
    if (item.eventName === "CapabilityRegistered" || item.eventName === "CapabilityUpdated") {
      const id = String(item.args.capabilityId ?? "");
      capabilities.set(id, {
        id,
        label: String(item.args.label ?? "Capability"),
        mode: modeLabels[Number(item.args.mode ?? 0)] ?? "LLM",
        somniaAgentId: String(item.args.somniaAgentId ?? ""),
        schemaURI: String(item.args.schemaURI ?? ""),
        active: true
      });
    }
    if (item.eventName === "CapabilityStatusChanged") {
      const id = String(item.args.capabilityId ?? "");
      const current = capabilities.get(id);
      if (current) current.active = Boolean(item.args.active);
    }
  }
  return [...capabilities.values()];
}

export function buildOSRevenue(activity: ActivityItem[]) {
  const events = activity.filter((item) => item.eventName === "ProtocolFeePaid");
  const total = events.reduce((sum, item) => sum + BigInt(String(item.args.amount ?? "0")), 0n);
  return {
    totalFees: `${Number(formatEther(total)).toFixed(4)} STT`,
    eventCount: events.length,
    feeAmount: `${Number(formatEther(parseEther("0.1"))).toFixed(4)} STT`,
    feeRecipient: osContracts.ProtocolFeeVault,
    events
  } satisfies OSRevenue;
}

export const defaultCapabilities = [
  { id: "content.write", label: "Content Writer", mode: "LLM", somniaAgentId: "12847293847561029384", schemaURI: "somniacos://schema/content.write", active: true },
  { id: "marketing.strategy", label: "Marketing Strategy", mode: "LLM", somniaAgentId: "12847293847561029384", schemaURI: "somniacos://schema/marketing.strategy", active: true },
  { id: "research.web", label: "Website Research", mode: "Website", somniaAgentId: "12875401142070969085", schemaURI: "somniacos://schema/research.web", active: true },
  { id: "research.api", label: "JSON API Research", mode: "JSON", somniaAgentId: "13174292974160097713", schemaURI: "somniacos://schema/research.api", active: true },
  { id: "audit.code", label: "Code Auditor", mode: "LLM", somniaAgentId: "12847293847561029384", schemaURI: "somniacos://schema/audit.code", active: true },
  { id: "treasury.plan", label: "Treasury Planner", mode: "LLM", somniaAgentId: "12847293847561029384", schemaURI: "somniacos://schema/treasury.plan", active: true },
  { id: "governance.draft", label: "Governance Drafter", mode: "LLM", somniaAgentId: "12847293847561029384", schemaURI: "somniacos://schema/governance.draft", active: true }
];
