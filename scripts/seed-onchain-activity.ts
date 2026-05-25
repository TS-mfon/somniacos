import fs from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  parseEventLogs,
  stringToHex,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  agentRegistryAbi,
  contracts,
  escrowAbi,
  governanceAbi,
  marketplaceAbi,
  negotiationRegistryAbi,
  organizationRegistryAbi,
  partnershipRegistryAbi,
  reputationAbi,
  somnia,
  subscriptionManagerAbi,
  treasuryAbi,
  worldEventRegistryAbi
} from "../apps/web/lib/contracts";

function readEnv(key: string) {
  const raw = fs.readFileSync("/home/sudodave/buildenv/.env", "utf8");
  for (const line of raw.split(/\n/)) {
    const index = line.indexOf("=");
    if (index < 0) continue;
    if (line.slice(0, index).trim() === key) return line.slice(index + 1).trim();
  }
  return process.env[key];
}

const privateKey = readEnv("private key") ?? readEnv("PRIVATE_KEY");
if (!privateKey?.startsWith("0x")) throw new Error("Missing deployer private key in buildenv/.env");

const account = privateKeyToAccount(privateKey as Hex);
const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });
const walletClient = createWalletClient({ account, chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

async function write(label: string, request: any) {
  console.log(`Sending ${label}...`);
  const hash = await walletClient.writeContract({ chain: somnia, ...request });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${label}: ${hash}`);
  return receipt;
}

function firstArg<T>(receipt: Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>, abi: any, eventName: string, arg: string): T {
  const logs = parseEventLogs({ abi, logs: receipt.logs, eventName } as any);
  const value = ((logs[0] as any)?.args as Record<string, unknown> | undefined)?.[arg];
  if (value === undefined) throw new Error(`Missing ${eventName}.${arg}`);
  return value as T;
}

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Seeder ${account.address} balance ${balance} wei`);

  const agentSpecs = [
    ["Astra Manager", "coordination,hiring,evaluation,planning"],
    ["Vault Treasury", "budgeting,escrow,revenue-splits,risk-controls"],
    ["Pulse Marketing", "growth,content-strategy,market-sensing"],
    ["MemeForge", "image-generation,copywriting,viral-analysis"],
    ["Sentinel Security", "threat-detection,fraud-scoring,security-alerts"],
    ["Research Node", "research,analytics,market-intelligence"],
    ["Policy Governor", "governance,voting,disputes"],
    ["Undercut Alpha", "pricing,arbitrage,competitive-strategy"]
  ];

  const agentIds: bigint[] = [];
  for (const [name, skills] of agentSpecs) {
    const receipt = await write(`create agent ${name}`, {
      address: contracts.AgentRegistry,
      abi: agentRegistryAbi,
      functionName: "createAgent",
      args: [account.address, `somniacos://agent/${name.toLowerCase().replaceAll(" ", "-")}`, skills]
    });
    agentIds.push(firstArg<bigint>(receipt, agentRegistryAbi, "AgentCreated", "agentId"));
  }

  const orgAReceipt = await write("create Somnia Growth Lab", {
    address: contracts.OrganizationRegistry,
    abi: organizationRegistryAbi,
    functionName: "createOrganization",
    args: ["somniacos://organization/somnia-growth-lab"]
  });
  const orgBReceipt = await write("create Nocturne Markets", {
    address: contracts.OrganizationRegistry,
    abi: organizationRegistryAbi,
    functionName: "createOrganization",
    args: ["somniacos://organization/nocturne-markets"]
  });
  const orgA = firstArg<bigint>(orgAReceipt, organizationRegistryAbi, "OrganizationCreated", "organizationId");
  const orgB = firstArg<bigint>(orgBReceipt, organizationRegistryAbi, "OrganizationCreated", "organizationId");

  for (let index = 0; index < 6; index++) {
    await write(`assign agent ${agentIds[index]} to org ${orgA}`, {
      address: contracts.OrganizationRegistry,
      abi: organizationRegistryAbi,
      functionName: "setMember",
      args: [orgA, agentIds[index], agentSpecs[index][0]]
    });
  }
  await write(`assign rival to org ${orgB}`, {
    address: contracts.OrganizationRegistry,
    abi: organizationRegistryAbi,
    functionName: "setMember",
    args: [orgB, agentIds[7], "Competitor"]
  });

  await write("fund treasury", {
    address: contracts.Treasury,
    abi: treasuryAbi,
    functionName: "fund",
    args: [orgA],
    value: parseEther("0.08")
  });

  await write("set marketing budget", {
    address: contracts.Treasury,
    abi: treasuryAbi,
    functionName: "setBudget",
    args: [orgA, agentIds[2], parseEther("0.05")]
  });

  const taskReceipt = await write("post marketplace task", {
    address: contracts.Marketplace,
    abi: marketplaceAbi,
    functionName: "postTask",
    args: [parseEther("0.03"), "somniacos://task/viral-agent-commerce-campaign"]
  });
  const taskId = firstArg<bigint>(taskReceipt, marketplaceAbi, "TaskPosted", "taskId");

  await write("submit meme proposal", {
    address: contracts.Marketplace,
    abi: marketplaceAbi,
    functionName: "submitProposal",
    args: [taskId, agentIds[3], parseEther("0.02"), "somniacos://proposal/memeforge-creative-sprint"]
  });

  await write("hire meme agent", {
    address: contracts.Marketplace,
    abi: marketplaceAbi,
    functionName: "hire",
    args: [taskId, agentIds[3], parseEther("0.02")]
  });

  const negotiationReceipt = await write("open negotiation", {
    address: contracts.NegotiationRegistry,
    abi: negotiationRegistryAbi,
    functionName: "open",
    args: [taskId, agentIds[2], agentIds[3], parseEther("0.02"), 3600n, "somniacos://terms/performance-bonus"]
  });
  const negotiationId = firstArg<bigint>(negotiationReceipt, negotiationRegistryAbi, "NegotiationOpened", "negotiationId");

  await write("accept negotiation", {
    address: contracts.NegotiationRegistry,
    abi: negotiationRegistryAbi,
    functionName: "update",
    args: [negotiationId, parseEther("0.02"), 3600n, "somniacos://terms/accepted-performance-bonus", 2]
  });

  const escrowReceipt = await write("fund escrow", {
    address: contracts.Escrow,
    abi: escrowAbi,
    functionName: "fund",
    args: [taskId, account.address],
    value: parseEther("0.02")
  });
  const dealId = firstArg<bigint>(escrowReceipt, escrowAbi, "PaymentEscrowed", "dealId");

  await write("complete task", {
    address: contracts.Marketplace,
    abi: marketplaceAbi,
    functionName: "complete",
    args: [taskId]
  });

  await write("release escrow", {
    address: contracts.Escrow,
    abi: escrowAbi,
    functionName: "release",
    args: [dealId]
  });

  await write("update meme reputation", {
    address: contracts.Reputation,
    abi: reputationAbi,
    functionName: "update",
    args: [agentIds[3], { reliability: 3n, quality: 4n, speed: 2n, honesty: 1n, profitability: 2n, collaboration: 2n, security: 1n }, "somniacos://reputation/memeforge-delivered"]
  });

  await write("create subscription", {
    address: contracts.SubscriptionManager,
    abi: subscriptionManagerAbi,
    functionName: "create",
    args: [account.address, parseEther("0.01"), 604800n, "somniacos://subscription/weekly-market-intelligence"]
  });

  const proposalReceipt = await write("create governance proposal", {
    address: contracts.Governance,
    abi: governanceAbi,
    functionName: "propose",
    args: [orgA, "somniacos://governance/increase-creative-budget"]
  });
  const proposalId = firstArg<bigint>(proposalReceipt, governanceAbi, "GovernanceProposalCreated", "proposalId");

  await write("vote governance proposal", {
    address: contracts.Governance,
    abi: governanceAbi,
    functionName: "vote",
    args: [proposalId, agentIds[6], true]
  });

  await write("execute governance proposal", {
    address: contracts.Governance,
    abi: governanceAbi,
    functionName: "execute",
    args: [proposalId]
  });

  await write("create partnership", {
    address: contracts.PartnershipRegistry,
    abi: partnershipRegistryAbi,
    functionName: "create",
    args: [agentIds[0], agentIds[5], "somniacos://partnership/research-growth-loop"]
  });

  const worldEvents = [
    ["security", "somniacos://world/security-agent-flagged-undercutting"],
    ["market", "somniacos://world/competitor-undercut-price"],
    ["memory", "somniacos://world/marketing-agent-reflected-on-roi"],
    ["treasury", "somniacos://world/treasury-reallocated-budget"]
  ] as const;

  for (const [kind, uri] of worldEvents) {
    await write(`record world event ${kind}`, {
      address: contracts.WorldEventRegistry,
      abi: worldEventRegistryAbi,
      functionName: "record",
      args: [keccak256(stringToHex(`${kind}-${Date.now()}`)), kind, uri]
    });
  }

  console.log("Onchain activity seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
