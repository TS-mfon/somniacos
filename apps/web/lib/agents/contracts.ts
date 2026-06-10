import type { Address } from "viem";

// Deployed to Somnia Shannon Testnet (chain 50312) on 2026-06-10.
// Deployer: 0xEd9EDd8586b20524CafA4F568413C504C9B03172
// Built against the real Somnia Agents Platform (0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776).
// draft() verified end-to-end: requestId 5897647 resolved via the live validator callback.
export const agentEconomyContracts = {
  ProtocolTreasury:       (process.env.NEXT_PUBLIC_AGENT_TREASURY        ?? "0x73834Ffb9747777D8D91f7C73Ff8DAECf1659e29") as Address,
  AgentEconomyDispatcher: (process.env.NEXT_PUBLIC_AGENT_DISPATCHER      ?? "0x71F6C53046539A2EB906F483B750eA05987A9c3b") as Address,
  ContentCodeSkills:      (process.env.NEXT_PUBLIC_AGENT_CONTENT_SKILLS  ?? "0x8b1d43b6aA40Ecb94c164333a3f5425B7a36B491") as Address,
  AgentIdentity:          (process.env.NEXT_PUBLIC_AGENT_IDENTITY        ?? "0x974edB3E733f6aa2f74C286054D9d5106667FD08") as Address,
} as const;

export const agentEconomyConfigured =
  Object.values(agentEconomyContracts).every((address) => address !== "0x_______");
