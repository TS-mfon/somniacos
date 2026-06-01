import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network/";
const privateKey = process.env.PRIVATE_KEY;
const feeRecipient =
  process.env.PROTOCOL_FEE_RECIPIENT ?? "0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E";

if (!privateKey) {
  throw new Error("Missing PRIVATE_KEY env var.");
}

const chain = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
} as const;

const account = privateKeyToAccount(privateKey as `0x${string}`);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

type Artifact = {
  abi: readonly unknown[];
  bytecode: { object: `0x${string}` };
};

type DeploymentResult = {
  address: `0x${string}`;
  transactionHash: `0x${string}`;
};

const outDir = resolve("packages/contracts/out/SomniacOSKernel.sol");
const deploymentPath = resolve("packages/config/deployments/somnia-shannon.json");

function artifact(name: string): Artifact {
  return JSON.parse(readFileSync(resolve(outDir, `${name}.json`), "utf8")) as Artifact;
}

async function deploy(name: string, args: readonly unknown[] = []): Promise<DeploymentResult> {
  const contract = artifact(name);
  const hash = await walletClient.deployContract({
    abi: contract.abi,
    bytecode: contract.bytecode.object,
    args,
    account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`${name} deployment failed: ${hash}`);
  }
  console.log(`${name}: ${receipt.contractAddress} (${hash})`);
  return { address: receipt.contractAddress, transactionHash: hash };
}

async function write(
  contractName: string,
  address: `0x${string}`,
  functionName: string,
  args: readonly unknown[] = [],
) {
  const contract = artifact(contractName);
  const hash = await walletClient.writeContract({
    address,
    abi: contract.abi,
    functionName,
    args,
    account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") {
    throw new Error(`${contractName}.${functionName} failed: ${hash}`);
  }
  console.log(`${contractName}.${functionName}: ${hash}`);
  return hash;
}

function capabilityId(label: string) {
  return keccak256(toHex(label));
}

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} STT`);
  console.log(`Protocol fee recipient: ${feeRecipient}`);

  const feeVault = await deploy("ProtocolFeeVault", [feeRecipient]);
  const capabilityRegistry = await deploy("CapabilityRegistry");
  const autonomyPolicyRegistry = await deploy("AutonomyPolicyRegistry", [feeVault.address]);
  const memoryLedger = await deploy("MemoryLedger");
  const processManager = await deploy("ProcessManager", [
    feeVault.address,
    autonomyPolicyRegistry.address,
    capabilityRegistry.address,
    memoryLedger.address,
  ]);
  const router = await deploy("SomniacAgentRouterV2", [
    "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776",
    processManager.address,
    autonomyPolicyRegistry.address,
    feeVault.address,
    12847293847561029384n,
    12875401142070969085n,
    13174292974160097713n,
    3n,
    parseEther("0.07"),
    parseEther("0.10"),
    parseEther("0.03"),
  ]);

  const setupTransactions: Record<string, string> = {};
  setupTransactions.MemoryLedgerSetProcessManager = await write(
    "MemoryLedger",
    memoryLedger.address,
    "setProcessManager",
    [processManager.address],
  );
  setupTransactions.ProcessManagerSetRouter = await write(
    "ProcessManager",
    processManager.address,
    "setRouter",
    [router.address],
  );
  setupTransactions.AutonomyPolicyRegistrySetWorkflowCreator = await write(
    "AutonomyPolicyRegistry",
    autonomyPolicyRegistry.address,
    "setWorkflowCreator",
    [router.address],
  );

  const capabilities = [
    ["content.write", "Content Writer", "Creates publishable social, blog, launch, and campaign copy.", 0, 12847293847561029384n],
    ["marketing.strategy", "Marketing Strategist", "Builds positioning, launch, funnel, and growth plans.", 0, 12847293847561029384n],
    ["research.web", "Web Research Analyst", "Reads source URLs and summarizes strategy-relevant findings.", 1, 12875401142070969085n],
    ["research.api", "JSON/API Research Analyst", "Fetches JSON APIs and extracts structured findings.", 2, 13174292974160097713n],
    ["audit.code", "Code Auditor", "Reviews code and smart-contract snippets for risks and fixes.", 0, 12847293847561029384n],
    ["treasury.plan", "Treasury Planner", "Creates budget, fee, runway, and allocation plans.", 0, 12847293847561029384n],
    ["governance.draft", "Governance Drafter", "Drafts DAO proposals, policies, and dispute decisions.", 0, 12847293847561029384n],
    ["security.monitor", "Security Monitor", "Assesses suspicious behavior and operational risk.", 0, 12847293847561029384n],
  ] as const;

  for (const [id, label, description, mode, agentId] of capabilities) {
    setupTransactions[`Capability:${id}`] = await write(
      "CapabilityRegistry",
      capabilityRegistry.address,
      "registerCapability",
      [capabilityId(id), label, description, mode, agentId, `somniacos://schema/${id}`],
    );
  }

  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  deployment.contracts = {
    ...deployment.contracts,
    ProtocolFeeVault: feeVault.address,
    CapabilityRegistry: capabilityRegistry.address,
    AutonomyPolicyRegistry: autonomyPolicyRegistry.address,
    MemoryLedger: memoryLedger.address,
    ProcessManager: processManager.address,
    SomniacAgentRouterV2: router.address,
  };
  deployment.transactions = {
    ...deployment.transactions,
    ProtocolFeeVault: feeVault.transactionHash,
    CapabilityRegistry: capabilityRegistry.transactionHash,
    AutonomyPolicyRegistry: autonomyPolicyRegistry.transactionHash,
    MemoryLedger: memoryLedger.transactionHash,
    ProcessManager: processManager.transactionHash,
    SomniacAgentRouterV2: router.transactionHash,
    ...setupTransactions,
  };
  deployment.protocolFee = {
    amountSTT: "0.1",
    recipient: feeRecipient,
  };
  writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
