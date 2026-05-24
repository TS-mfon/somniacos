import { agents, economyEdges, negotiations, organizations, worldEvents } from "@somniacos/shared";

export function GET() {
  return Response.json({ agents, organizations, negotiations, economyEdges, worldEvents });
}
