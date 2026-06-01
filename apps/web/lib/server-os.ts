import { formatEther, type Address } from "viem";
import { osContracts, processManagerAbi, protocolFeeVaultAbi } from "./contracts";
import { publicClient } from "./server-onchain";
import { osAvailable, type OSProcess, type OSProcessStep } from "./os-state";

const processStatuses: Record<number, OSProcess["status"]> = {
  1: "Created",
  2: "Running",
  3: "Waiting",
  4: "Completed",
  5: "Failed",
  6: "Cancelled"
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

export async function getOSProcessesDirect(limit = 25) {
  if (!osAvailable()) return [];
  const nextProcessId = await publicClient.readContract({
    address: osContracts.ProcessManager as Address,
    abi: processManagerAbi,
    functionName: "nextProcessId"
  });
  const lastId = Number(nextProcessId) - 1;
  if (lastId <= 0) return [];

  const ids = Array.from({ length: Math.min(limit, lastId) }, (_, index) => BigInt(lastId - index));
  const processes = await Promise.all(ids.map((id) => readProcessDirect(id)));
  return processes.filter(Boolean) as OSProcess[];
}

export async function getOSProcessDirect(id: string) {
  if (!osAvailable()) return null;
  return readProcessDirect(BigInt(id));
}

export async function getOSRevenueDirect() {
  if (!osAvailable()) return null;
  const [feeAmount, feeRecipient, totalCollected] = await Promise.all([
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "feeAmount"
    }),
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "feeRecipient"
    }),
    publicClient.readContract({
      address: osContracts.ProtocolFeeVault as Address,
      abi: protocolFeeVaultAbi,
      functionName: "totalCollected"
    })
  ]);
  return {
    totalFees: `${Number(formatEther(totalCollected)).toFixed(4)} STT`,
    feeAmount: `${Number(formatEther(feeAmount)).toFixed(4)} STT`,
    feeRecipient,
    totalCollected: `${Number(formatEther(totalCollected)).toFixed(4)} STT`
  };
}

async function readProcessDirect(id: bigint) {
  const process = await publicClient.readContract({
    address: osContracts.ProcessManager as Address,
    abi: processManagerAbi,
    functionName: "processes",
    args: [id]
  });
  const [owner, goal, policyId, status, spent, stepCount, createdAt, , resultURI, finalSummary] = process;
  if (!owner || owner === "0x0000000000000000000000000000000000000000") return null;

  const steps = await Promise.all(Array.from({ length: Number(stepCount) }, (_, index) => readStepDirect(id, BigInt(index + 1))));
  return {
    id: id.toString(),
    owner,
    policyId: policyId.toString(),
    goal,
    status: processStatuses[status] ?? "Created",
    metadataURI: "",
    finalSummary,
    resultURI,
    tx: "",
    blockNumber: createdAt.toString(),
    steps: steps.filter(Boolean) as OSProcessStep[],
    feesPaid: `${Number(formatEther(spent)).toFixed(4)} STT`
  } satisfies OSProcess;
}

async function readStepDirect(processId: bigint, stepId: bigint) {
  const step = await publicClient.readContract({
    address: osContracts.ProcessManager as Address,
    abi: processManagerAbi,
    functionName: "steps",
    args: [processId, stepId]
  });
  const [, capabilityId, appAgentId, , requestId, mode, status, prompt, url, result, , completedAt] = step;
  if (requestId === 0n) return null;
  return {
    id: stepId.toString(),
    processId: processId.toString(),
    capabilityId,
    appAgentId,
    requestId: requestId.toString(),
    mode: modeLabels[mode] ?? "LLM",
    status: stepStatuses[status] ?? "Pending",
    prompt,
    url,
    result,
    tx: "",
    callbackTx: completedAt > 0n ? "" : undefined,
    totalCost: undefined
  } satisfies OSProcessStep;
}
