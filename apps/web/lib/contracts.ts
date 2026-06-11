import { defineChain, fallback, http } from "viem";

export const somnia = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.infra.testnet.somnia.network/", "https://dream-rpc.somnia.network/"] },
    public: { http: ["https://api.infra.testnet.somnia.network/", "https://dream-rpc.somnia.network/"] }
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://shannon-explorer.somnia.network" }
  }
});

export function somniaTransport() {
  return fallback(somnia.rpcUrls.default.http.map((url) => http(url)));
}

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
  WorldEventRegistry: "0x4Fe350F97542911DDc95ceb09510f61de05068d9",
  SomniacAgentRouter: "0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B"
} as const;

export const zeroAddress = "0x0000000000000000000000000000000000000000";

export const osContracts = {
  ProtocolFeeVault: process.env.NEXT_PUBLIC_PROTOCOL_FEE_VAULT ?? "0xfd74c336792dd54862e6694bb76ff865aac06cf0",
  CapabilityRegistry: process.env.NEXT_PUBLIC_CAPABILITY_REGISTRY ?? "0xbf5163d30a914d907be2fb9973940668e404127e",
  AutonomyPolicyRegistry: process.env.NEXT_PUBLIC_AUTONOMY_POLICY_REGISTRY ?? "0x36f5e0b1d305255eeca1b39583239fdac59c3318",
  ProcessManager: process.env.NEXT_PUBLIC_PROCESS_MANAGER ?? "0xa345c95ce5d3b5b2e12d6cee31b1289865b7456a",
  MemoryLedger: process.env.NEXT_PUBLIC_MEMORY_LEDGER ?? "0x051c953d7a28a0f6d1738f238ad4bea3454312a8",
  SomniacAgentRouterV2: process.env.NEXT_PUBLIC_SOMNIAC_AGENT_ROUTER_V2 ?? "0xe426357cc73f67efa9bc5741b4875a6a52a55c99"
} as const;

export const extensionContracts = {
  SomniacTokenFactory: process.env.NEXT_PUBLIC_SOMNIAC_TOKEN_FACTORY ?? "0x3b9d345511d7ea0f84b46058b389d9d0c9fe04a0"
} as const;

export const osKernelEnabled = process.env.NEXT_PUBLIC_ENABLE_OS_KERNEL !== "false";
export const osKernelConfigured = Object.values(osContracts).every((address) => address !== zeroAddress);

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

export const somniacAgentRouterAbi = [
  { type: "function", name: "getRequiredDeposit", stateMutability: "view", inputs: [{ name: "mode", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "requestAgentRun", stateMutability: "payable", inputs: [{ name: "appAgentId", type: "string" }, { name: "task", type: "string" }, { name: "constraints", type: "string" }, { name: "urls", type: "string[]" }], outputs: [{ name: "requestId", type: "uint256" }] },
  { type: "function", name: "getRun", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [{ name: "user", type: "address" }, { name: "appAgentId", type: "string" }, { name: "task", type: "string" }, { name: "constraints", type: "string" }, { name: "url", type: "string" }, { name: "somniaAgentId", type: "uint256" }, { name: "mode", type: "uint8" }, { name: "status", type: "uint8" }, { name: "result", type: "string" }, { name: "createdAt", type: "uint256" }, { name: "completedAt", type: "uint256" }] },
  { type: "event", name: "AgentRunRequested", inputs: [{ indexed: true, name: "requestId", type: "uint256" }, { indexed: true, name: "user", type: "address" }, { indexed: false, name: "appAgentId", type: "string" }, { indexed: true, name: "somniaAgentId", type: "uint256" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "task", type: "string" }, { indexed: false, name: "url", type: "string" }, { indexed: false, name: "deposit", type: "uint256" }] },
  { type: "event", name: "AgentRunCompleted", inputs: [{ indexed: true, name: "requestId", type: "uint256" }, { indexed: true, name: "user", type: "address" }, { indexed: false, name: "appAgentId", type: "string" }, { indexed: false, name: "status", type: "uint8" }, { indexed: false, name: "result", type: "string" }] }
] as const;

export const protocolFeeVaultAbi = [
  { type: "function", name: "feeAmount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "feeRecipient", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "totalCollected", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "event", name: "ProtocolFeePaid", inputs: [{ indexed: true, name: "payer", type: "address" }, { indexed: false, name: "actionType", type: "string" }, { indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "FeeRecipientUpdated", inputs: [{ indexed: true, name: "recipient", type: "address" }] },
  { type: "event", name: "FeeAmountUpdated", inputs: [{ indexed: false, name: "amount", type: "uint256" }] },
  { type: "event", name: "ProtocolFeesWithdrawn", inputs: [{ indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "amount", type: "uint256" }] }
] as const;

export const capabilityRegistryAbi = [
  { type: "function", name: "capabilityIds", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "bytes32" }] },
  { type: "function", name: "capabilities", stateMutability: "view", inputs: [{ name: "", type: "bytes32" }], outputs: [{ name: "id", type: "bytes32" }, { name: "label", type: "string" }, { name: "description", type: "string" }, { name: "mode", type: "uint8" }, { name: "active", type: "bool" }, { name: "somniaAgentId", type: "uint256" }, { name: "schemaURI", type: "string" }] },
  { type: "function", name: "getCapabilityCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "registerCapability", stateMutability: "nonpayable", inputs: [{ name: "capabilityId", type: "bytes32" }, { name: "label", type: "string" }, { name: "description", type: "string" }, { name: "mode", type: "uint8" }, { name: "somniaAgentId", type: "uint256" }, { name: "schemaURI", type: "string" }], outputs: [] },
  { type: "event", name: "CapabilityRegistered", inputs: [{ indexed: true, name: "capabilityId", type: "bytes32" }, { indexed: false, name: "label", type: "string" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "somniaAgentId", type: "uint256" }, { indexed: false, name: "schemaURI", type: "string" }] },
  { type: "event", name: "CapabilityUpdated", inputs: [{ indexed: true, name: "capabilityId", type: "bytes32" }, { indexed: false, name: "label", type: "string" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "somniaAgentId", type: "uint256" }, { indexed: false, name: "schemaURI", type: "string" }] },
  { type: "event", name: "CapabilityStatusChanged", inputs: [{ indexed: true, name: "capabilityId", type: "bytes32" }, { indexed: false, name: "active", type: "bool" }] }
] as const;

export const autonomyPolicyRegistryAbi = [
  { type: "function", name: "setWorkflowCreator", stateMutability: "nonpayable", inputs: [{ name: "workflowCreator_", type: "address" }], outputs: [] },
  { type: "function", name: "createPolicy", stateMutability: "payable", inputs: [{ name: "maxSpend", type: "uint256" }, { name: "maxSteps", type: "uint256" }, { name: "maxRetries", type: "uint256" }, { name: "allowChainedSteps", type: "bool" }, { name: "capabilities_", type: "bytes32[]" }, { name: "allowedDomainsURI", type: "string" }], outputs: [{ name: "policyId", type: "uint256" }] },
  { type: "event", name: "PolicyCreated", inputs: [{ indexed: true, name: "policyId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: false, name: "maxSpend", type: "uint256" }, { indexed: false, name: "maxSteps", type: "uint256" }, { indexed: false, name: "maxRetries", type: "uint256" }, { indexed: false, name: "allowChainedSteps", type: "bool" }, { indexed: false, name: "allowedDomainsURI", type: "string" }] },
  { type: "event", name: "PolicyUpdated", inputs: [{ indexed: true, name: "policyId", type: "uint256" }, { indexed: false, name: "maxSpend", type: "uint256" }, { indexed: false, name: "maxSteps", type: "uint256" }, { indexed: false, name: "maxRetries", type: "uint256" }, { indexed: false, name: "allowChainedSteps", type: "bool" }, { indexed: false, name: "allowedDomainsURI", type: "string" }] },
  { type: "event", name: "WorkflowCreatorUpdated", inputs: [{ indexed: true, name: "workflowCreator", type: "address" }] }
] as const;

export const processManagerAbi = [
  { type: "function", name: "nextProcessId", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "processes", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "owner", type: "address" }, { name: "goal", type: "string" }, { name: "policyId", type: "uint256" }, { name: "status", type: "uint8" }, { name: "spent", type: "uint256" }, { name: "stepCount", type: "uint256" }, { name: "createdAt", type: "uint256" }, { name: "updatedAt", type: "uint256" }, { name: "resultURI", type: "string" }, { name: "finalSummary", type: "string" }] },
  { type: "function", name: "steps", stateMutability: "view", inputs: [{ name: "", type: "uint256" }, { name: "", type: "uint256" }], outputs: [{ name: "processId", type: "uint256" }, { name: "capabilityId", type: "bytes32" }, { name: "appAgentId", type: "string" }, { name: "somniaAgentId", type: "uint256" }, { name: "requestId", type: "uint256" }, { name: "mode", type: "uint8" }, { name: "status", type: "uint8" }, { name: "prompt", type: "string" }, { name: "url", type: "string" }, { name: "result", type: "string" }, { name: "createdAt", type: "uint256" }, { name: "completedAt", type: "uint256" }] },
  { type: "function", name: "createProcess", stateMutability: "payable", inputs: [{ name: "goal", type: "string" }, { name: "policyId", type: "uint256" }, { name: "metadataURI", type: "string" }], outputs: [{ name: "processId", type: "uint256" }] },
  { type: "function", name: "completeProcess", stateMutability: "nonpayable", inputs: [{ name: "processId", type: "uint256" }, { name: "finalSummary", type: "string" }, { name: "resultURI", type: "string" }], outputs: [] },
  { type: "event", name: "ProcessCreated", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "owner", type: "address" }, { indexed: true, name: "policyId", type: "uint256" }, { indexed: false, name: "goal", type: "string" }, { indexed: false, name: "metadataURI", type: "string" }] },
  { type: "event", name: "ProcessStarted", inputs: [{ indexed: true, name: "processId", type: "uint256" }] },
  { type: "event", name: "ProcessStepRequested", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: true, name: "capabilityId", type: "bytes32" }, { indexed: false, name: "appAgentId", type: "string" }, { indexed: false, name: "somniaAgentId", type: "uint256" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "requestId", type: "uint256" }, { indexed: false, name: "prompt", type: "string" }, { indexed: false, name: "url", type: "string" }, { indexed: false, name: "totalCost", type: "uint256" }] },
  { type: "event", name: "ProcessStepCompleted", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" }, { indexed: false, name: "status", type: "uint8" }, { indexed: false, name: "result", type: "string" }] },
  { type: "event", name: "ProcessCompleted", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: false, name: "finalSummary", type: "string" }, { indexed: false, name: "resultURI", type: "string" }] },
  { type: "event", name: "ProcessFailed", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: false, name: "reason", type: "string" }] },
  { type: "event", name: "ProcessCancelled", inputs: [{ indexed: true, name: "processId", type: "uint256" }] }
] as const;

export const memoryLedgerAbi = [
  { type: "event", name: "MemoryWritten", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: false, name: "kind", type: "string" }, { indexed: false, name: "contentURI", type: "string" }, { indexed: false, name: "summary", type: "string" }, { indexed: true, name: "writer", type: "address" }] },
  { type: "event", name: "AgentHandoff", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "fromCapability", type: "bytes32" }, { indexed: true, name: "toCapability", type: "bytes32" }, { indexed: false, name: "reasonURI", type: "string" }] },
  { type: "event", name: "ProcessEvaluation", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: false, name: "score", type: "uint256" }, { indexed: false, name: "riskLevel", type: "string" }, { indexed: false, name: "evaluationURI", type: "string" }] }
] as const;

export const somniacAgentRouterV2Abi = [
  { type: "function", name: "getRequiredDeposit", stateMutability: "view", inputs: [{ name: "mode", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getTotalDue", stateMutability: "view", inputs: [{ name: "mode", type: "uint8" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "getRun", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [{ name: "processId", type: "uint256" }, { name: "stepId", type: "uint256" }, { name: "user", type: "address" }, { name: "capabilityId", type: "bytes32" }, { name: "appAgentId", type: "string" }, { name: "task", type: "string" }, { name: "url", type: "string" }, { name: "somniaAgentId", type: "uint256" }, { name: "mode", type: "uint8" }, { name: "status", type: "uint8" }, { name: "result", type: "string" }] },
  { type: "function", name: "requestProcessAgentRun", stateMutability: "payable", inputs: [{ name: "processId", type: "uint256" }, { name: "capabilityId", type: "bytes32" }, { name: "appAgentId", type: "string" }, { name: "task", type: "string" }, { name: "constraints", type: "string" }, { name: "urls", type: "string[]" }, { name: "mode", type: "uint8" }], outputs: [{ name: "requestId", type: "uint256" }] },
  { type: "function", name: "launchWorkflowAgentRun", stateMutability: "payable", inputs: [{ name: "maxSpend", type: "uint256" }, { name: "maxSteps", type: "uint256" }, { name: "maxRetries", type: "uint256" }, { name: "allowChainedSteps", type: "bool" }, { name: "allowedCapabilities", type: "bytes32[]" }, { name: "allowedDomainsURI", type: "string" }, { name: "processGoal", type: "string" }, { name: "processMetadataURI", type: "string" }, { name: "capabilityId", type: "bytes32" }, { name: "appAgentId", type: "string" }, { name: "task", type: "string" }, { name: "constraints", type: "string" }, { name: "urls", type: "string[]" }, { name: "mode", type: "uint8" }], outputs: [{ name: "processId", type: "uint256" }, { name: "requestId", type: "uint256" }] },
  { type: "event", name: "OSAgentRunRequested", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" }, { indexed: false, name: "user", type: "address" }, { indexed: false, name: "capabilityId", type: "bytes32" }, { indexed: false, name: "appAgentId", type: "string" }, { indexed: false, name: "somniaAgentId", type: "uint256" }, { indexed: false, name: "mode", type: "uint8" }, { indexed: false, name: "task", type: "string" }, { indexed: false, name: "url", type: "string" }, { indexed: false, name: "deposit", type: "uint256" }, { indexed: false, name: "protocolFee", type: "uint256" }] },
  { type: "event", name: "OSAgentRunCompleted", inputs: [{ indexed: true, name: "processId", type: "uint256" }, { indexed: true, name: "stepId", type: "uint256" }, { indexed: true, name: "requestId", type: "uint256" }, { indexed: false, name: "status", type: "uint8" }, { indexed: false, name: "result", type: "string" }] }
] as const;

export const somniacTokenFactoryAbi = [
  { type: "function", name: "createToken", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }, { name: "decimals", type: "uint8" }, { name: "initialSupply", type: "uint256" }, { name: "owner", type: "address" }, { name: "metadataURI", type: "string" }], outputs: [{ name: "token", type: "address" }] },
  { type: "function", name: "allTokensLength", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "tokensByOwnerLength", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "isSomniacToken", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "event", name: "TokenCreated", inputs: [{ indexed: true, name: "token", type: "address" }, { indexed: true, name: "owner", type: "address" }, { indexed: true, name: "deployer", type: "address" }, { indexed: false, name: "name", type: "string" }, { indexed: false, name: "symbol", type: "string" }, { indexed: false, name: "decimals", type: "uint8" }, { indexed: false, name: "initialSupply", type: "uint256" }, { indexed: false, name: "metadataURI", type: "string" }] }
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
  { key: "WorldEventRegistry", address: contracts.WorldEventRegistry, abi: worldEventRegistryAbi },
  { key: "SomniacAgentRouter", address: contracts.SomniacAgentRouter, abi: somniacAgentRouterAbi }
] as const;

export const osContractCatalog = [
  { key: "ProtocolFeeVault", address: osContracts.ProtocolFeeVault, abi: protocolFeeVaultAbi },
  { key: "CapabilityRegistry", address: osContracts.CapabilityRegistry, abi: capabilityRegistryAbi },
  { key: "AutonomyPolicyRegistry", address: osContracts.AutonomyPolicyRegistry, abi: autonomyPolicyRegistryAbi },
  { key: "ProcessManager", address: osContracts.ProcessManager, abi: processManagerAbi },
  { key: "MemoryLedger", address: osContracts.MemoryLedger, abi: memoryLedgerAbi },
  { key: "SomniacAgentRouterV2", address: osContracts.SomniacAgentRouterV2, abi: somniacAgentRouterV2Abi }
].filter((contract) => contract.address !== zeroAddress);

export const extensionContractCatalog = [
  { key: "SomniacTokenFactory", address: extensionContracts.SomniacTokenFactory, abi: somniacTokenFactoryAbi }
].filter((contract) => contract.address !== zeroAddress);

export const fullContractCatalog = [...contractCatalog, ...osContractCatalog, ...extensionContractCatalog] as const;
