import type { Address } from "viem";

// Deployed to Somnia Shannon Testnet (chain 50312) on 2026-06-10.
// Deployer: 0xEd9EDd8586b20524CafA4F568413C504C9B03172
export const agentEconomyContracts = {
  ProtocolTreasury:       (process.env.NEXT_PUBLIC_AGENT_TREASURY        ?? "0xcfE1321cC58eFc64b1a0Af0568082e7A9a3dCA62") as Address,
  AgentEconomyDispatcher: (process.env.NEXT_PUBLIC_AGENT_DISPATCHER      ?? "0xe10e8d223f97c9bAA6450aeD2B78c91B45c4CEd7") as Address,
  ContentCodeSkills:      (process.env.NEXT_PUBLIC_AGENT_CONTENT_SKILLS  ?? "0xf6BB8410b2A93fe0aEC5774E37e1352F746Dde29") as Address,
  AgentIdentity:          (process.env.NEXT_PUBLIC_AGENT_IDENTITY        ?? "0xC7C6EDb47a7264f0B337C695736Fea02877ca272") as Address,
} as const;

export const agentEconomyConfigured =
  Object.values(agentEconomyContracts).every((address) => address !== "0x_______");
