import { getAddress, type Address } from "viem";

// Deployed to Somnia Shannon Testnet (chain 50312) on 2026-06-10.
// Deployer: 0xEd9EDd8586b20524CafA4F568413C504C9B03172
// Built against the real Somnia Agents Platform (0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776).
// draft() verified end-to-end: requestId 5897647 resolved via the live validator callback.
// getAddress() normalizes EIP-55 casing so a mis-cased env value can't break readContract.
const addr = (value: string): Address => getAddress(value);

export const agentEconomyContracts = {
  ProtocolTreasury:       addr(process.env.NEXT_PUBLIC_AGENT_TREASURY       ?? "0x3A723BE28c9Bc3148C8A184d611C170ADD811a19"),
  AgentEconomyDispatcher: addr(process.env.NEXT_PUBLIC_AGENT_DISPATCHER     ?? "0x7ba7F20A1a5ba5C16FD4C45fAb317efAADdefFa6"),
  ContentCodeSkills:      addr(process.env.NEXT_PUBLIC_AGENT_CONTENT_SKILLS ?? "0xDb58fb23419B2B909B75Cd7Cb13A379d90Ba4822"),
  AgentIdentity:          addr(process.env.NEXT_PUBLIC_AGENT_IDENTITY       ?? "0x98aFb47435694Fa681b1f1F6D6b1ec0F938F734d"),
} as const;

export const agentEconomyConfigured = true;
