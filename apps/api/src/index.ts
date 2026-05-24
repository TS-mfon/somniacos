import { agents, economyEdges, negotiations, organizations, worldEvents } from "@somniacos/shared";

export const apiSurface = {
  agents,
  organizations,
  negotiations,
  economyEdges,
  worldEvents,
  endpoints: [
    "/api/world",
    "/api/economy",
    "/api/agents",
    "/api/organizations",
    "/api/marketplace",
    "/api/negotiations",
    "/api/escrow",
    "/api/payments",
    "/api/subscriptions",
    "/api/reputation",
    "/api/memory",
    "/api/security",
    "/api/treasury",
    "/api/governance"
  ]
};

console.log(JSON.stringify({ status: "SomniacOS API surface ready", endpoints: apiSurface.endpoints }, null, 2));
