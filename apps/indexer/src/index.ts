const contractEvents = [
  "AgentCreated",
  "OrganizationCreated",
  "TaskPosted",
  "ProposalSubmitted",
  "NegotiationUpdated",
  "AgentHired",
  "PaymentEscrowed",
  "TaskCompleted",
  "PaymentReleased",
  "ReputationUpdated",
  "DisputeOpened",
  "PartnershipCreated",
  "SubscriptionCreated",
  "GovernanceProposalCreated",
  "GovernanceVoteCast",
  "WorldEventRecorded"
];

export function describeIndexerPlan() {
  return {
    rpcUrl: process.env.SOMNIA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "not configured",
    latestIndexedBlock: process.env.LATEST_INDEXED_BLOCK ?? "0",
    eventFamilies: contractEvents,
    outputs: ["indexed_contract_events", "world_events", "websocket:broadcast"]
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(describeIndexerPlan(), null, 2));
}
