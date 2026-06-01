import { readFileSync } from "node:fs";
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
const task =
  process.env.OS_TASK ??
  "Write one concise X post explaining why autonomous onchain agents matter for crypto users. Include one practical example.";
const appAgentId = process.env.OS_AGENT_ID ?? "content-writer";
const capability = process.env.OS_CAPABILITY ?? "content.write";
const constraints =
  process.env.OS_CONSTRAINTS ??
  "Keep it under 280 characters. Make it useful, clear, and non-hype.";

if (!privateKey) throw new Error("Missing PRIVATE_KEY env var.");

const chain = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
} as const;

type Artifact = {
  abi: readonly unknown[];
};

type Deployment = {
  contracts: {
    SomniacAgentRouterV2: `0x${string}`;
  };
};

const account = privateKeyToAccount(privateKey as `0x${string}`);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
const deployment = JSON.parse(readFileSync(resolve("packages/config/deployments/somnia-shannon.json"), "utf8")) as Deployment;
const routerArtifact = JSON.parse(
  readFileSync(resolve("packages/contracts/out/SomniacOSKernel.sol/SomniacAgentRouterV2.json"), "utf8"),
) as Artifact;

function capabilityId(label: string) {
  return keccak256(toHex(label));
}

async function main() {
  const router = deployment.contracts.SomniacAgentRouterV2;
  const totalDue = await publicClient.readContract({
    address: router,
    abi: routerArtifact.abi,
    functionName: "getTotalDue",
    args: [0],
  });

  console.log(`Runner: ${account.address}`);
  console.log(`Router: ${router}`);
  console.log(`Total due: ${formatEther(totalDue as bigint)} STT`);

  const hash = await walletClient.writeContract({
    address: router,
    abi: routerArtifact.abi,
    functionName: "launchWorkflowAgentRun",
    args: [
      parseEther("1"),
      3n,
      1n,
      true,
      [
        capabilityId("content.write"),
        capabilityId("marketing.strategy"),
        capabilityId("research.web"),
        capabilityId("research.api"),
        capabilityId("audit.code"),
        capabilityId("treasury.plan"),
        capabilityId("governance.draft"),
        capabilityId("security.monitor"),
      ],
      "somniacos://policy/demo",
      `Run ${appAgentId}: ${task}`,
      "somniacos://process/demo-seed",
      capabilityId(capability),
      appAgentId,
      task,
      constraints,
      [],
      0,
    ],
    account,
    value: totalDue as bigint,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error(`OS workflow failed: ${hash}`);
  console.log(`Workflow tx: ${hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
