import { createPublicClient, decodeEventLog, formatEther, http, type Abi, type Address, type Hash, type TransactionReceipt } from "viem";
import { contractCatalog, somnia } from "./contracts";

export const publicClient = createPublicClient({
  chain: somnia,
  transport: http(somnia.rpcUrls.default.http[0])
});

const eventLabels: Record<string, string> = {
  AgentCreated: "Agent created",
  AgentUpdated: "Agent updated",
  OrganizationCreated: "Organization created",
  OrganizationMemberSet: "Organization member assigned",
  TaskPosted: "Task posted",
  ProposalSubmitted: "Proposal submitted",
  AgentHired: "Agent hired",
  TaskCompleted: "Task completed",
  NegotiationOpened: "Negotiation opened",
  NegotiationUpdated: "Negotiation updated",
  PaymentEscrowed: "Escrow funded",
  PaymentReleased: "Payment released",
  DisputeOpened: "Dispute opened",
  ReputationUpdated: "Reputation updated",
  SubscriptionCreated: "Subscription created",
  SubscriptionCancelled: "Subscription cancelled",
  TreasuryFunded: "Treasury funded",
  BudgetSet: "Budget set",
  TreasurySpent: "Treasury spent",
  GovernanceProposalCreated: "Governance proposal created",
  GovernanceVoteCast: "Governance vote cast",
  GovernanceProposalExecuted: "Governance proposal executed",
  PartnershipCreated: "Partnership created",
  WorldEventRecorded: "World event recorded",
  AgentRunRequested: "Somnia Agent requested",
  AgentRunCompleted: "Somnia Agent completed"
};

const seededTransactionHashes = [
  "0x667349defe1ab60af2a832f7b844c616769e53e6ae4b3c6929f0e24f1c994cba",
  "0xac316d44e5c8f820ffbdf79f4622ef1e86c82cc0d522b754f9cf2e02aadde49f",
  "0xcb95ddbd0c73f7e25e15424ab75bf294b036d8f8d01f6e95763f30f550b2e321",
  "0x5f3ea073914a94d9ae9fb21baac37a701f9fe19021c2881c130f397907fa36d2",
  "0xdac81c4c775217fc0fb56da37f73d00d117ef76143e1b49b6d7148915808b4d0",
  "0x6bea6dcd7e1cc361c4f4ee005a9cce33e285068aac49a68e25e9abc200256194",
  "0xa9a5d31181f1831e6d059b9fb548d1d403a5ff8d1d57bca0bff2aaacf86bb98a",
  "0xb44bf443a59c549e183ce300696ac9b605ff01d89d1c56399b85915e4746a711",
  "0xb831b8b6ed4a77c4a3792be6cd4daa3dd67a144cacdda5727a6df4cf40123880",
  "0x3c94dd7aab73f42c8b2aafc85b9861b2ab4363ead14d4377d6a4ea64d9d46af3",
  "0x5f981285770a7cc3023c4ec20a719527eae4b1f201ac99e5d0a96f08c951f589",
  "0x9bbdc55f6697df1bc0d5177ac4316121680621ee16491b17568f5415f63edd3d",
  "0xeb58b09da490d651fda72935ba0a94ade43294769862af1f792ffe9fd5b2f272",
  "0xecb4196e8c304d47f0d285371fd219135dcd5b59e5828f3d2f429d4c06994670",
  "0xdb8f645088edcab9e439c35607f7d0005f49a157f0a16f91913ce4383b6b1c27",
  "0xee3c210feee2520d5739f3f67e341f99e987fe4af611d2f03a95f71501e2743a",
  "0x6c392704ee04bc5c21a6b285f05eb377cff7f1ba9cfe9270d1ecc0085ffb0e28",
  "0xbbbca3d78aa1dc47d950e568e394d6f808cc021e20d27d694e0fa276bc760385",
  "0xb3aa11a7385d96326decfe0cb1cd16fdd7350c2c456b120ac52442f8622374cc",
  "0x94620cfee44bba14ecdbf8a981877538350022032bef4653d56e79a92a297028",
  "0x77b46f59ee2bae4721f59888c5c986c9527ff6bc8bad54198b238232c5baf8d6",
  "0xb7a652de8f96420bbfbfefce2b1e8cdd6951cbbad3bd0fbaf52c7557202e0304",
  "0x07bc20923583e10ebe41a8c53eb3e9539048f178980735d5c2f3f958f53915c8",
  "0xa0b1dd67c9ce76388aabd6559883e08171e1800cff4ae9309ec31a7cd5e6a7b5",
  "0xe3477eaab3161c9d2f0f17753ef6ca3c3ef429e7b800e290feca5d143c9fc6d3",
  "0x173eb0968428123003052fb1698d2bd9916b689774d5ec26ee386e96d6ea3d35",
  "0xa3759bfd052c7e363bc3039acce435c838f2853d631a29fd9d7e91372a0ad502",
  "0x493c3f2aa03f7e296a3706f87de4a3ba0ab76fb6b8ae9aade2ff23fe8ce8801c"
] as const;

function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

function valueFromArgs(eventName: string, args: Record<string, unknown>) {
  const amount = args.amount ?? args.budget ?? args.price;
  if (typeof amount === "bigint") return `${formatEther(amount)} STT`;
  return undefined;
}

export async function getOnchainActivity() {
  const latest = await publicClient.getBlockNumber();
  // Somnia Shannon currently limits eth_getLogs ranges to 1000 blocks.
  const fromBlock = latest > 950n ? latest - 950n : 0n;

  const logBatches = await Promise.all(contractCatalog.map(async (contract) => {
    const logs = await publicClient.getLogs({
      address: contract.address as Address,
      fromBlock,
      toBlock: "latest"
    });

    return decodeLogs(logs);
  }));

  const receipts = await Promise.all(seededTransactionHashes.map(async (hash) => {
    try {
      return await publicClient.getTransactionReceipt({ hash: hash as Hash });
    } catch {
      return null;
    }
  }));
  const seeded = receipts.flatMap((receipt) => receipt ? decodeReceipt(receipt) : []);
  const merged = [...logBatches.flat(), ...seeded];
  const unique = new Map(merged.map((item) => [item.id, item]));
  return [...unique.values()].sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)) || Number(b.logIndex - a.logIndex));
}

function decodeReceipt(receipt: TransactionReceipt) {
  return decodeLogs(receipt.logs.map((log) => ({ ...log, transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber })));
}

function decodeLogs(logs: Array<{ address: Address; data: `0x${string}`; topics: [] | [`0x${string}`, ...`0x${string}`[]]; transactionHash?: Hash; blockNumber?: bigint; logIndex?: number }>) {
  return logs.flatMap((log) => {
    const contract = contractCatalog.find((item) => item.address.toLowerCase() === log.address.toLowerCase());
    if (!contract) return [];
    try {
      const decoded = decodeEventLog({
        abi: contract.abi as Abi,
        data: log.data,
        topics: log.topics
      });
      const eventName = decoded.eventName ?? "UnknownEvent";
      const args = serialize(decoded.args ?? {}) as Record<string, unknown>;
      return [{
        id: `${log.transactionHash}-${log.logIndex}`,
        contract: contract.key,
        contractAddress: contract.address,
        eventName,
        title: eventLabels[eventName] ?? eventName,
        args,
        value: valueFromArgs(eventName, args),
        transactionHash: log.transactionHash ?? "0x",
        blockNumber: log.blockNumber?.toString() ?? "0",
        logIndex: log.logIndex ?? 0
      }];
    } catch {
      return [];
    }
  });
}
