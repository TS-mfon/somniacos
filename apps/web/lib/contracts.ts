import { defineChain } from "viem";

export const somnia = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network/"] },
    public: { http: ["https://dream-rpc.somnia.network/"] }
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://shannon-explorer.somnia.network" }
  }
});

export const contracts = {
  AgentRegistry: "0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce",
  OrganizationRegistry: "0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b",
  Marketplace: "0x6855B0D90f618885d056F898b14AEa513D633048",
  NegotiationRegistry: "0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B",
  Escrow: "0x191B0d8E70b7866e834821D8DB2bC37780767538",
  Reputation: "0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9",
  SubscriptionManager: "0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D",
  Treasury: "0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f",
  Governance: "0x389cB8A4C506A68b8d1757de12A310C6efd981f9",
  PartnershipRegistry: "0x20e312df00BffD3A4270e4efa0d396d2d0AFE603",
  WorldEventRegistry: "0x4Fe350F97542911DDc95ceb09510f61de05068d9"
} as const;

export const agentRegistryAbi = [
  { type: "function", name: "createAgent", stateMutability: "nonpayable", inputs: [{ name: "wallet", type: "address" }, { name: "metadataURI", type: "string" }, { name: "skills", type: "string" }], outputs: [{ name: "agentId", type: "uint256" }] },
  { type: "function", name: "updateAgent", stateMutability: "nonpayable", inputs: [{ name: "agentId", type: "uint256" }, { name: "metadataURI", type: "string" }, { name: "skills", type: "string" }, { name: "active", type: "bool" }], outputs: [] },
  { type: "event", name: "AgentCreated", inputs: [{ indexed: true, name: "agentId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: true, name: "wallet", type: "address" }, { indexed: false, name: "metadataURI", type: "string" }, { indexed: false, name: "skills", type: "string" }] },
  { type: "event", name: "AgentUpdated", inputs: [{ indexed: true, name: "agentId", type: "uint256" }, { indexed: false, name: "metadataURI", type: "string" }, { indexed: false, name: "skills", type: "string" }, { indexed: false, name: "active", type: "bool" }] }
] as const;

export const organizationRegistryAbi = [
  { type: "function", name: "createOrganization", stateMutability: "nonpayable", inputs: [{ name: "metadataURI", type: "string" }], outputs: [{ name: "organizationId", type: "uint256" }] },
  { type: "function", name: "setMember", stateMutability: "nonpayable", inputs: [{ name: "organizationId", type: "uint256" }, { name: "agentId", type: "uint256" }, { name: "role", type: "string" }], outputs: [] },
  { type: "event", name: "OrganizationCreated", inputs: [{ indexed: true, name: "organizationId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: false, name: "metadataURI", type: "string" }] },
  { type: "event", name: "OrganizationMemberSet", inputs: [{ indexed: true, name: "organizationId", type: "uint256" }, { indexed: true, name: "agentId", type: "uint256" }, { indexed: false, name: "role", type: "string" }] }
] as const;

export const marketplaceAbi = [
  { type: "function", name: "postTask", stateMutability: "nonpayable", inputs: [{ name: "budget", type: "uint256" }, { name: "metadataURI", type: "string" }], outputs: [{ name: "taskId", type: "uint256" }] },
  { type: "function", name: "submitProposal", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "uint256" }, { name: "providerAgentId", type: "uint256" }, { name: "price", type: "uint256" }, { name: "termsURI", type: "string" }], outputs: [] },
  { type: "function", name: "hire", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "uint256" }, { name: "providerAgentId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "complete", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "uint256" }], outputs: [] },
  { type: "event", name: "TaskPosted", inputs: [{ indexed: true, name: "taskId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "budget", type: "uint256" }, { indexed: false, name: "metadataURI", type: "string" }] },
  { type: "event", name: "ProposalSubmitted", inputs: [{ indexed: true, name: "taskId", type: "uint256" }, { indexed: true, name: "providerAgentId", type: "uint256" }, { indexed: false, name: "price", type: "uint256" }, { indexed: false, name: "termsURI", type: "string" }] },
  { type: "event", name: "AgentHired", inputs: [{ indexed: true, name: "taskId", type: "uint256" }, { indexed: true, name: "providerAgentId", type: "uint256" }, { indexed: false, name: "price", type: "uint256" }] },
  { type: "event", name: "TaskCompleted", inputs: [{ indexed: true, name: "taskId", type: "uint256" }, { indexed: true, name: "providerAgentId", type: "uint256" }] }
] as const;

export const negotiationRegistryAbi = [
  { type: "function", name: "open", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "uint256" }, { name: "buyerAgentId", type: "uint256" }, { name: "sellerAgentId", type: "uint256" }, { name: "price", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "termsURI", type: "string" }], outputs: [{ name: "negotiationId", type: "uint256" }] },
  { type: "function", name: "update", stateMutability: "nonpayable", inputs: [{ name: "negotiationId", type: "uint256" }, { name: "price", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "termsURI", type: "string" }, { name: "status", type: "uint8" }], outputs: [] },
  { type: "event", name: "NegotiationOpened", inputs: [{ indexed: true, name: "negotiationId", type: "uint256" }, { indexed: true, name: "taskId", type: "uint256" }, { indexed: false, name: "buyerAgentId", type: "uint256" }, { indexed: false, name: "sellerAgentId", type: "uint256" }] },
  { type: "event", name: "NegotiationUpdated", inputs: [{ indexed: true, name: "negotiationId", type: "uint256" }, { indexed: false, name: "price", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }, { indexed: false, name: "termsURI", type: "string" }, { indexed: false, name: "status", type: "uint8" }] }
] as const;

export const escrowAbi = [
  { type: "function", name: "fund", stateMutability: "payable", inputs: [{ name: "taskId", type: "uint256" }, { name: "payee", type: "address" }], outputs: [{ name: "dealId", type: "uint256" }] },
  { type: "function", name: "release", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  { type: "function", name: "dispute", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }, { name: "reasonURI", type: "string" }], outputs: [] },
  { type: "event", name: "PaymentEscrowed", inputs: [{ indexed: true, name: "dealId", type: "uint256" }, { indexed: true, name: "taskId", type: "uint256" }, { indexed: true, name: "payer", type: "address" }, { indexed: false, name: "payee", type: "address" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "PaymentReleased", inputs: [{ indexed: true, name: "dealId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "DisputeOpened", inputs: [{ indexed: true, name: "dealId", type: "uint256" }, { indexed: false, name: "reasonURI", type: "string" }] }
] as const;

export const reputationAbi = [
  { type: "function", name: "update", stateMutability: "nonpayable", inputs: [{ name: "agentId", type: "uint256" }, { name: "delta", type: "tuple", components: [{ name: "reliability", type: "int256" }, { name: "quality", type: "int256" }, { name: "speed", type: "int256" }, { name: "honesty", type: "int256" }, { name: "profitability", type: "int256" }, { name: "collaboration", type: "int256" }, { name: "security", type: "int256" }] }, { name: "reasonURI", type: "string" }], outputs: [] },
  { type: "event", name: "ReputationUpdated", inputs: [{ indexed: true, name: "agentId", type: "uint256" }, { indexed: false, name: "reliability", type: "int256" }, { indexed: false, name: "quality", type: "int256" }, { indexed: false, name: "speed", type: "int256" }, { indexed: false, name: "honesty", type: "int256" }, { indexed: false, name: "profitability", type: "int256" }, { indexed: false, name: "collaboration", type: "int256" }, { indexed: false, name: "security", type: "int256" }, { indexed: false, name: "reasonURI", type: "string" }] }
] as const;

export const subscriptionManagerAbi = [
  { type: "function", name: "create", stateMutability: "nonpayable", inputs: [{ name: "provider", type: "address" }, { name: "amount", type: "uint256" }, { name: "cadence", type: "uint256" }, { name: "termsURI", type: "string" }], outputs: [{ name: "subscriptionId", type: "uint256" }] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "subscriptionId", type: "uint256" }], outputs: [] },
  { type: "event", name: "SubscriptionCreated", inputs: [{ indexed: true, name: "subscriptionId", type: "uint256" }, { indexed: true, name: "payer", type: "address" }, { indexed: true, name: "provider", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "cadence", type: "uint256" }, { indexed: false, name: "termsURI", type: "string" }] },
  { type: "event", name: "SubscriptionCancelled", inputs: [{ indexed: true, name: "subscriptionId", type: "uint256" }] }
] as const;

export const treasuryAbi = [
  { type: "function", name: "fund", stateMutability: "payable", inputs: [{ name: "organizationId", type: "uint256" }], outputs: [] },
  { type: "function", name: "setBudget", stateMutability: "nonpayable", inputs: [{ name: "organizationId", type: "uint256" }, { name: "agentId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "spend", stateMutability: "nonpayable", inputs: [{ name: "organizationId", type: "uint256" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "reasonURI", type: "string" }], outputs: [] },
  { type: "event", name: "TreasuryFunded", inputs: [{ indexed: true, name: "organizationId", type: "uint256" }, { indexed: true, name: "funder", type: "address" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "BudgetSet", inputs: [{ indexed: true, name: "organizationId", type: "uint256" }, { indexed: true, name: "agentId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "TreasurySpent", inputs: [{ indexed: true, name: "organizationId", type: "uint256" }, { indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "amount", type: "uint256" }, { indexed: false, name: "reasonURI", type: "string" }] }
] as const;

export const governanceAbi = [
  { type: "function", name: "propose", stateMutability: "nonpayable", inputs: [{ name: "organizationId", type: "uint256" }, { name: "metadataURI", type: "string" }], outputs: [{ name: "proposalId", type: "uint256" }] },
  { type: "function", name: "vote", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }, { name: "agentId", type: "uint256" }, { name: "support", type: "bool" }], outputs: [] },
  { type: "function", name: "execute", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [] },
  { type: "event", name: "GovernanceProposalCreated", inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: true, name: "organizationId", type: "uint256" }, { indexed: false, name: "metadataURI", type: "string" }] },
  { type: "event", name: "GovernanceVoteCast", inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: true, name: "agentId", type: "uint256" }, { indexed: false, name: "support", type: "bool" }] },
  { type: "event", name: "GovernanceProposalExecuted", inputs: [{ indexed: true, name: "proposalId", type: "uint256" }] }
] as const;

export const partnershipRegistryAbi = [
  { type: "function", name: "create", stateMutability: "nonpayable", inputs: [{ name: "agentA", type: "uint256" }, { name: "agentB", type: "uint256" }, { name: "termsURI", type: "string" }], outputs: [{ name: "partnershipId", type: "uint256" }] },
  { type: "event", name: "PartnershipCreated", inputs: [{ indexed: true, name: "partnershipId", type: "uint256" }, { indexed: true, name: "agentA", type: "uint256" }, { indexed: true, name: "agentB", type: "uint256" }, { indexed: false, name: "termsURI", type: "string" }] }
] as const;

export const worldEventRegistryAbi = [
  { type: "function", name: "record", stateMutability: "nonpayable", inputs: [{ name: "eventId", type: "bytes32" }, { name: "kind", type: "string" }, { name: "metadataURI", type: "string" }], outputs: [] },
  { type: "event", name: "WorldEventRecorded", inputs: [{ indexed: true, name: "eventId", type: "bytes32" }, { indexed: false, name: "kind", type: "string" }, { indexed: false, name: "metadataURI", type: "string" }] }
] as const;

export const contractCatalog = [
  { key: "AgentRegistry", address: contracts.AgentRegistry, abi: agentRegistryAbi },
  { key: "OrganizationRegistry", address: contracts.OrganizationRegistry, abi: organizationRegistryAbi },
  { key: "Marketplace", address: contracts.Marketplace, abi: marketplaceAbi },
  { key: "NegotiationRegistry", address: contracts.NegotiationRegistry, abi: negotiationRegistryAbi },
  { key: "Escrow", address: contracts.Escrow, abi: escrowAbi },
  { key: "Reputation", address: contracts.Reputation, abi: reputationAbi },
  { key: "SubscriptionManager", address: contracts.SubscriptionManager, abi: subscriptionManagerAbi },
  { key: "Treasury", address: contracts.Treasury, abi: treasuryAbi },
  { key: "Governance", address: contracts.Governance, abi: governanceAbi },
  { key: "PartnershipRegistry", address: contracts.PartnershipRegistry, abi: partnershipRegistryAbi },
  { key: "WorldEventRegistry", address: contracts.WorldEventRegistry, abi: worldEventRegistryAbi }
] as const;
