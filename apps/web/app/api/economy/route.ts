import { agents, economyEdges, negotiations, organizations, worldEvents } from "@somniacos/shared";

export function GET() {
  return Response.json({
    provenance: "design-fixture",
    live: false,
    warning: "Seeded civilization fixtures for design and tests. Do not present as live on-chain state.",
    agents,
    organizations,
    negotiations,
    economyEdges,
    worldEvents
  });
}
