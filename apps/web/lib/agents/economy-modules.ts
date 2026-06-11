import { getAddress, type Address } from "viem";

export type EconomyModuleId = "drafter" | "website-research" | "marketplace" | "work-verification" | "agentpay" | "court" | "reputation" | "negotiation" | "memory" | "bounties" | "payroll" | "compliance" | "sla" | "sentinel";

const address = (value: string | undefined, fallback: string) => getAddress(value ?? fallback) as Address;

export const economyModules: Record<EconomyModuleId, { title: string; description: string; address: Address; website: boolean }> = {
  drafter: { title: "Drafter", description: "Fund a Somnia LLM drafting request and settle it from the callback verdict.", address: address(process.env.NEXT_PUBLIC_ECONOMY_DRAFTER, "0xDb58fb23419B2B909B75Cd7Cb13A379d90Ba4822"), website: false },
  "website-research": { title: "Website Research", description: "Send a reference URL only through the Somnia Website agent.", address: address(process.env.NEXT_PUBLIC_ECONOMY_WEBSITE_RESEARCH, "0x0585152853547134a7eF9A2A2ede5326f2Af8496"), website: true },
  marketplace: { title: "Marketplace", description: "Fund a capability-priced service request and settle it from Somnia evidence.", address: address(process.env.NEXT_PUBLIC_ECONOMY_MARKETPLACE, "0x409424DA561231b6367cC2FDDD55C2613cC1133a"), website: false },
  "work-verification": { title: "Work Verification", description: "Submit standalone delivery evidence for a Somnia verification verdict.", address: address(process.env.NEXT_PUBLIC_ECONOMY_WORK_VERIFICATION, "0x0E3e1839157074888D48d244FcfE0bCFFE7B9Bf7"), website: false },
  agentpay: { title: "AgentPay", description: "Create condition-gated payments with PASS, FAIL, or SPLIT settlement.", address: address(process.env.NEXT_PUBLIC_ECONOMY_AGENTPAY, "0x2e819Ce921fFefFD9af549373879D289364Ff3cd"), website: false },
  court: { title: "Disputes / Court", description: "Fund evidence-backed disputes and linked appeals for Somnia rulings.", address: address(process.env.NEXT_PUBLIC_ECONOMY_COURT, "0x9C4B4c82C55A4Add5FF2F764deb613dC07b45f39"), website: false },
  reputation: { title: "Reputation", description: "Record funded, evidence-backed reputation assessments.", address: address(process.env.NEXT_PUBLIC_ECONOMY_REPUTATION, "0x23ba60f47a555DaB6d54EeEe0CC202a1ecFc3D02"), website: false },
  negotiation: { title: "Negotiation", description: "Create authenticated funded offers and settle accepted terms.", address: address(process.env.NEXT_PUBLIC_ECONOMY_NEGOTIATION, "0x4efb586164f89fc934a9A20Ad820dDDA5A078F27"), website: false },
  memory: { title: "Memory", description: "Anchor summaries, commitments, and authorized memory-read evidence.", address: address(process.env.NEXT_PUBLIC_ECONOMY_MEMORY, "0x93DD96b0843ECe31597B5a78a2B4F93113fd1b9F"), website: false },
  bounties: { title: "Bounties", description: "Fund bounty evidence and pay successful claims through pull settlement.", address: address(process.env.NEXT_PUBLIC_ECONOMY_BOUNTIES, "0x1aD7c7117b90336f4ac210d9770d5c7516557d76"), website: false },
  payroll: { title: "Payroll", description: "Prepay a cycle and verify its evidence before payout.", address: address(process.env.NEXT_PUBLIC_ECONOMY_PAYROLL, "0x6025e282999E2b4A674425D51646FeA99C2ce2Ac"), website: false },
  compliance: { title: "Compliance", description: "Send a source URL through the Somnia Website agent for a risk verdict.", address: address(process.env.NEXT_PUBLIC_ECONOMY_COMPLIANCE, "0xDB999ca3706aE19fA48A24afacB429F005A1C768"), website: true },
  sla: { title: "SLA", description: "Fund penalty escrow and settle delivery or breach evidence.", address: address(process.env.NEXT_PUBLIC_ECONOMY_SLA, "0xCf22A70e2Edcc87376d12Ca9FB869D2F62d74C48"), website: false },
  sentinel: { title: "Sentinel", description: "Publish a Website-agent-backed signal with callback proof.", address: address(process.env.NEXT_PUBLIC_ECONOMY_SENTINEL, "0x1143af692b86994dCBb0b86A34AB2A1461E4AAFF"), website: true }
};
