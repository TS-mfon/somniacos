import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network/";
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("Missing PRIVATE_KEY env var.");

const chain = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
} as const;

const account = privateKeyToAccount(privateKey as `0x${string}`);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
const artifactPath = resolve("packages/contracts/out/SomniacTokenFactory.sol/SomniacTokenFactory.json");
const deploymentPath = resolve("packages/config/deployments/somnia-shannon.json");

type Artifact = {
  abi: readonly unknown[];
  bytecode: { object: `0x${string}` };
};

async function main() {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as Artifact;
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} STT`);

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`SomniacTokenFactory deployment failed: ${hash}`);

  console.log(`SomniacTokenFactory: ${receipt.contractAddress} (${hash})`);

  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  deployment.contracts = {
    ...deployment.contracts,
    SomniacTokenFactory: receipt.contractAddress,
  };
  deployment.transactions = {
    ...deployment.transactions,
    SomniacTokenFactory: hash,
  };
  writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
