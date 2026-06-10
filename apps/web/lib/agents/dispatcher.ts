import { decodeEventLog, type Abi, type Address, type PublicClient } from "viem";

// Real ABI for the redeployed ContentCodeSkills module on Somnia Shannon.
// draft() forwards callPrice() STT; the dispatcher routes the platform callback into
// resolveDraft, which records results(requestId) and emits DraftResolved.
export const contentCodeSkillsAbi = [
  {
    type: "function",
    name: "draft",
    stateMutability: "payable",
    inputs: [
      { name: "topic", type: "string" },
      { name: "audience", type: "string" },
      { name: "format", type: "string" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  { type: "function", name: "callPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "protocolFee", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function",
    name: "results",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "text", type: "string" },
      { name: "resolved", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "DraftRequested",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "topic", type: "string" },
      { indexed: false, name: "audience", type: "string" },
      { indexed: false, name: "format", type: "string" },
    ],
  },
  {
    type: "event",
    name: "DraftResolved",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: false, name: "text", type: "string" },
    ],
  },
] as const satisfies Abi;

export const agentEconomyDispatcherAbi = [
  { type: "function", name: "requiredDeposit", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "event",
    name: "Dispatched",
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "module", type: "address" },
      { indexed: true, name: "initiator", type: "address" },
      { indexed: false, name: "agentId", type: "uint256" },
    ],
  },
] as const satisfies Abi;

export const agentIdentityAbi = [
  {
    type: "function",
    name: "requestRegistration",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "capabilities", type: "string[]" },
      { name: "stake", type: "uint256" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    type: "event",
    name: "RegistrationApproved",
    inputs: [
      { indexed: true, name: "agent", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
  },
  {
    type: "event",
    name: "RegistrationDenied",
    inputs: [
      { indexed: true, name: "agent", type: "address" },
      { indexed: false, name: "reason", type: "string" },
    ],
  },
] as const satisfies Abi;

// Somnia RPC caps eth_getLogs at 1000 blocks; poll the cheap view function instead.
export async function waitForDraftResult(opts: {
  client: PublicClient;
  module: Address;
  requestId: bigint;
  timeoutMs?: number;
  pollIntervalMs?: number;
  onTick?: (elapsedMs: number) => void;
}): Promise<string> {
  const { client, module, requestId, onTick } = opts;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 4000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [text, resolved] = (await client.readContract({
      address: module,
      abi: contentCodeSkillsAbi,
      functionName: "results",
      args: [requestId],
    })) as [string, boolean];
    if (resolved) return text;
    onTick?.(Date.now() - start);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`Timed out waiting for the Somnia validator callback on request ${requestId}.`);
}

export function decodeDraftRequestId(logs: { address: string; data: `0x${string}`; topics: `0x${string}`[] }[], module: Address): bigint | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== module.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: contentCodeSkillsAbi, data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      if (decoded.eventName === "DraftRequested") return (decoded.args as { requestId: bigint }).requestId;
    } catch {
      // Not a DraftRequested log; keep scanning.
    }
  }
  return null;
}
